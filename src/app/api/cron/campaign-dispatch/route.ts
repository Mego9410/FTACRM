import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEmailProvider } from "@/lib/email/provider";
import {
  buildContactContext,
  buildPracticeMarketingContext,
  buildSenderContext,
  renderMergeTags,
} from "@/lib/merge-tags";
import { renderEmailShell } from "@/lib/email/shell";

const BATCH_SIZE = 100;

/**
 * Every minute: drain queued campaign recipients through the email provider.
 * Safe no-op while no provider is linked.
 */
export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  const provider = getEmailProvider();
  if (!provider.configured) {
    return NextResponse.json({ skipped: true, reason: "no email provider linked" });
  }

  const admin = createAdminClient();
  const { data: campaigns } = await admin
    .from("campaigns")
    .select(
      "id, subject, body_html, practice_id, from_profile_id, profiles!campaigns_from_profile_id_fkey(full_name, email, signature_html)",
    )
    .eq("status", "sending")
    .limit(3);

  let sentTotal = 0;
  for (const campaign of campaigns ?? []) {
    const sender = campaign.profiles as unknown as {
      full_name: string;
      email: string;
      signature_html: string | null;
    } | null;

    let practiceCtx = {};
    if (campaign.practice_id) {
      const { data: practice } = await admin
        .from("practices")
        .select("display_title, town, county, asking_price, price_prefix, surgeries")
        .eq("id", campaign.practice_id)
        .single();
      if (practice) practiceCtx = buildPracticeMarketingContext(practice);
    }

    const { data: recipients } = await admin
      .from("campaign_recipients")
      .select("id, email, contact_id, contacts!campaign_recipients_contact_id_fkey(title, first_name, last_name, company_name, salutation, email)")
      .eq("campaign_id", campaign.id)
      .eq("status", "queued")
      .limit(BATCH_SIZE);

    if (!recipients || recipients.length === 0) {
      await admin
        .from("campaigns")
        .update({ status: "sent", completed_at: new Date().toISOString() })
        .eq("id", campaign.id);
      continue;
    }

    for (const r of recipients) {
      const contact = r.contacts as unknown as Parameters<typeof buildContactContext>[0] | null;
      const { data: token } = await admin
        .from("unsubscribe_tokens")
        .insert({ contact_id: r.contact_id, campaign_id: campaign.id })
        .select("token")
        .single();
      const unsubscribeUrl = `${process.env.NEXT_PUBLIC_APP_URL}/unsubscribe/${token?.token ?? ""}`;

      const ctx = {
        ...(contact ? buildContactContext(contact) : {}),
        ...practiceCtx,
        ...(sender ? buildSenderContext(sender) : {}),
      };
      const html = renderEmailShell({
        bodyText: renderMergeTags(campaign.body_html ?? "", ctx),
        unsubscribeUrl,
        senderName: sender?.full_name ?? "Frank Taylor & Associates",
      });
      const subject = renderMergeTags(campaign.subject ?? "", ctx);

      const result = await provider.send({
        to: r.email,
        subject,
        html,
        replyTo: sender?.email,
      });

      if (result.ok) {
        await admin
          .from("campaign_recipients")
          .update({ status: "sent", provider_message_id: result.providerMessageId, sent_at: new Date().toISOString() })
          .eq("id", r.id);
        sentTotal += 1;
      } else {
        await admin
          .from("campaign_recipients")
          .update({ status: result.permanent ? "failed" : "queued" })
          .eq("id", r.id);
        if (!result.permanent) break; // transient (rate limit) — stop this run, retry next minute
      }
    }

    const { count: sentCount } = await admin
      .from("campaign_recipients")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign.id)
      .eq("status", "sent");
    await admin.from("campaigns").update({ sent_count: sentCount ?? 0 }).eq("id", campaign.id);
  }

  return NextResponse.json({ sent: sentTotal });
}
