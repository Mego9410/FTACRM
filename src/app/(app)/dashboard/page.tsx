import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, EmptyState, Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/primitives";
import { formatDateTime, formatGBP, relativeTime } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const [eventsRes, tasksRes, stalledRes, expiringRes, activityRes] = await Promise.all([
    supabase
      .from("calendar_events")
      .select("id, title, starts_at, ends_at, location, organiser_id, calendar_event_attendees(profile_id)")
      .gte("starts_at", startOfDay.toISOString())
      .lte("starts_at", endOfDay.toISOString())
      .neq("status", "cancelled")
      .order("starts_at")
      .limit(20),
    supabase
      .from("tasks")
      .select("id, title, due_at, status, contact_id, practice_id, deal_id")
      .eq("assignee_id", profile.id)
      .eq("status", "open")
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(8),
    supabase
      .from("deals")
      .select("id, ref, agreed_price, last_activity_at, practices!deals_practice_id_fkey(display_title)")
      .eq("status", "in_progress")
      .eq("owner_id", profile.id)
      .lt("last_activity_at", new Date(Date.now() - 14 * 86_400_000).toISOString())
      .order("last_activity_at")
      .limit(5),
    supabase
      .from("practices")
      .select("id, display_title, contract_expiry")
      .in("status", ["available", "under_offer", "sold_stc"])
      .not("contract_expiry", "is", null)
      .lte("contract_expiry", new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10))
      .order("contract_expiry")
      .limit(5),
    supabase
      .from("journal_entries")
      .select("id, entry_type, subject, body, occurred_at, author_id, contact_id, practice_id, deal_id, profiles!journal_entries_author_id_fkey(full_name)")
      .order("occurred_at", { ascending: false })
      .limit(8),
  ]);

  const myEvents = (eventsRes.data ?? []).filter(
    (e) =>
      e.organiser_id === profile.id ||
      (e.calendar_event_attendees as { profile_id: string | null }[]).some(
        (a) => a.profile_id === profile.id,
      ),
  );
  const firstName = profile.full_name.split(" ")[0];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[26px] font-extrabold tracking-tight text-fg-1">
          Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, {firstName}
        </h1>
        <p className="mt-0.5 text-sm text-fg-3">
          {new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date())}
        </p>
      </div>

      {(stalledRes.data?.length ?? 0) > 0 || (expiringRes.data?.length ?? 0) > 0 ? (
        <Card className="mb-5 border-warn/40 bg-warn-bg/60">
          <div className="px-5 py-3.5">
            <p className="mb-2 text-sm font-bold text-fg-1">Needs attention</p>
            <ul className="space-y-1.5 text-sm">
              {(stalledRes.data ?? []).map((d) => {
                const practice = d.practices as unknown as { display_title: string } | null;
                return (
                  <li key={d.id}>
                    <Link href={`/deals/${d.id}`} className="font-semibold text-gold-deep hover:underline">
                      {practice?.display_title ?? d.ref}
                    </Link>{" "}
                    — no deal activity since {relativeTime(d.last_activity_at)}
                  </li>
                );
              })}
              {(expiringRes.data ?? []).map((p) => (
                <li key={p.id}>
                  <Link href={`/practices/${p.id}`} className="font-semibold text-gold-deep hover:underline">
                    {p.display_title}
                  </Link>{" "}
                  — agency contract expires {p.contract_expiry}
                </li>
              ))}
            </ul>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader
            title="Today's events"
            action={
              <Link href="/calendar">
                <Button variant="ghost" size="sm">View calendar</Button>
              </Link>
            }
          />
          <div className="p-4">
            {myEvents.length === 0 ? (
              <EmptyState title="No events today" body="Enjoy the clear diary, or add something." className="border-0 py-8" />
            ) : (
              <ul className="space-y-2.5">
                {myEvents.map((e) => (
                  <li key={e.id} className="rounded-sm border border-line px-3 py-2">
                    <p className="text-sm font-semibold text-fg-1">{e.title}</p>
                    <p className="text-xs text-fg-3">
                      {new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(e.starts_at))}
                      {" – "}
                      {new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(e.ends_at))}
                      {e.location ? ` · ${e.location}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            title="My tasks"
            action={
              <Link href="/tasks">
                <Button variant="ghost" size="sm">All tasks</Button>
              </Link>
            }
          />
          <div className="p-4">
            {(tasksRes.data ?? []).length === 0 ? (
              <EmptyState title="No open tasks" body="Tasks assigned to you appear here." className="border-0 py-8" />
            ) : (
              <ul className="space-y-2.5">
                {(tasksRes.data ?? []).map((t) => {
                  const overdue = t.due_at && new Date(t.due_at) < new Date();
                  return (
                    <li key={t.id} className="flex items-center justify-between gap-2 rounded-sm border border-line px-3 py-2">
                      <p className="min-w-0 truncate text-sm font-semibold text-fg-1">{t.title}</p>
                      {t.due_at ? (
                        <Badge tone={overdue ? "danger" : "neutral"}>{formatDateTime(t.due_at)}</Badge>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Recent activity" />
          <div className="p-4">
            {(activityRes.data ?? []).length === 0 ? (
              <EmptyState title="No activity yet" body="Calls, notes and updates across the firm show here." className="border-0 py-8" />
            ) : (
              <ul className="space-y-2.5">
                {(activityRes.data ?? []).map((j) => {
                  const author = j.profiles as unknown as { full_name: string } | null;
                  const href = j.contact_id
                    ? `/contacts/${j.contact_id}`
                    : j.practice_id
                      ? `/practices/${j.practice_id}`
                      : j.deal_id
                        ? `/deals/${j.deal_id}`
                        : "#";
                  return (
                    <li key={j.id} className="text-sm">
                      <Link href={href} className="hover:underline">
                        <span className="font-semibold text-fg-1">{author?.full_name ?? "System"}</span>{" "}
                        <span className="text-fg-3">
                          {j.entry_type} · {relativeTime(j.occurred_at)}
                        </span>
                        <span className="block truncate text-fg-2">{j.subject ?? j.body ?? ""}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
