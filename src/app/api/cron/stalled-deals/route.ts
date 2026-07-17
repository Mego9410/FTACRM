import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const STALLED_DAYS = 14;

/** Daily: flag in-progress deals with no activity and notify their owners. */
export async function GET(request: NextRequest) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - STALLED_DAYS * 86_400_000).toISOString();

  const { data: stalled } = await admin
    .from("deals")
    .select("id, ref, owner_id, last_activity_at, practices!deals_practice_id_fkey(display_title)")
    .eq("status", "in_progress")
    .lt("last_activity_at", cutoff);

  let notified = 0;
  for (const deal of stalled ?? []) {
    if (!deal.owner_id) continue;
    // One reminder per deal per week, not one per day.
    const { data: recent } = await admin
      .from("notifications")
      .select("id")
      .eq("profile_id", deal.owner_id)
      .eq("kind", "deal_stalled")
      .eq("link_url", `/deals/${deal.id}`)
      .gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString())
      .limit(1);
    if (recent && recent.length > 0) continue;

    const practice = deal.practices as unknown as { display_title: string } | null;
    const idleDays = Math.floor((Date.now() - new Date(deal.last_activity_at).getTime()) / 86_400_000);
    await admin.from("notifications").insert({
      profile_id: deal.owner_id,
      kind: "deal_stalled",
      title: "Deal needs a nudge",
      body: `${practice?.display_title ?? deal.ref} — no activity for ${idleDays} days`,
      link_url: `/deals/${deal.id}`,
    });
    notified += 1;
  }

  return NextResponse.json({ stalled: stalled?.length ?? 0, notified });
}
