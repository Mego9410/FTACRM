import { NextResponse, type NextRequest } from "next/server";
import { cronUnauthorized } from "@/lib/http/verify-secret";
import { createAdminClient } from "@/lib/supabase/admin";

const STALLED_DAYS = 14;

/**
 * Daily: flag in-progress deals with no activity and nudge the people who run
 * them. There's no per-record owner, so the reminder goes to every active
 * manager and admin (the deal-progression watchers), once per deal per week.
 */
export async function GET(request: NextRequest) {
  const unauth = cronUnauthorized(request);
  if (unauth) return unauth;
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - STALLED_DAYS * 86_400_000).toISOString();

  const [{ data: stalled }, { data: watchers }] = await Promise.all([
    admin
      .from("deals")
      .select("id, ref, last_activity_at, practices!deals_practice_id_fkey(display_title)")
      .eq("status", "in_progress")
      .lt("last_activity_at", cutoff),
    admin.from("profiles").select("id").in("role", ["admin", "manager"]).eq("is_active", true),
  ]);

  const watcherIds = (watchers ?? []).map((w) => w.id);
  let notified = 0;
  for (const deal of stalled ?? []) {
    const practice = deal.practices as unknown as { display_title: string } | null;
    const idleDays = Math.floor((Date.now() - new Date(deal.last_activity_at).getTime()) / 86_400_000);
    for (const watcherId of watcherIds) {
      // One reminder per deal per person per week, not one per day.
      const { data: recent } = await admin
        .from("notifications")
        .select("id")
        .eq("profile_id", watcherId)
        .eq("kind", "deal_stalled")
        .eq("link_url", `/deals/${deal.id}`)
        .gte("created_at", new Date(Date.now() - 7 * 86_400_000).toISOString())
        .limit(1);
      if (recent && recent.length > 0) continue;

      await admin.from("notifications").insert({
        profile_id: watcherId,
        kind: "deal_stalled",
        title: "Deal needs a nudge",
        body: `${practice?.display_title ?? deal.ref} — no activity for ${idleDays} days`,
        link_url: `/deals/${deal.id}`,
      });
      notified += 1;
    }
  }

  return NextResponse.json({ stalled: stalled?.length ?? 0, notified });
}
