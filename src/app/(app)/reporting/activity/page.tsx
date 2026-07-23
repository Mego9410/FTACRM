import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { Avatar, Badge, Button, Card, EmptyState } from "@/components/ui/primitives";
import { formatDateTime, relativeTime } from "@/lib/utils";
import { ActivityFilters } from "./activity-filters";

export const metadata = { title: "Activity feed" };

const PAGE_SIZE = 50;

type Search = { author?: string; type?: string; before?: string };

export default async function ActivityFeedPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireRole("manager"); // [SEV-LOW-03] align with the other reporting pages
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("journal_entries")
    .select(
      "id, entry_type, subject, body, occurred_at, contact_id, practice_id, deal_id, profiles!journal_entries_author_id_fkey(id, full_name, calendar_color), contacts!journal_entries_contact_id_fkey(first_name, last_name, company_name), practices!journal_entries_practice_id_fkey(display_title)",
    )
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE_SIZE);

  // Keyset pagination — no OFFSET, stays fast at any depth.
  if (params.before) query = query.lt("occurred_at", params.before);
  if (params.author) query = query.eq("author_id", params.author);
  if (params.type) query = query.eq("entry_type", params.type);

  const [{ data: entries }, { data: team }] = await Promise.all([
    query,
    supabase.from("profiles").select("id, full_name").eq("is_active", true).order("full_name"),
  ]);

  const last = entries?.[entries.length - 1];
  const qs = (before: string) => {
    const sp = new URLSearchParams();
    if (params.author) sp.set("author", params.author);
    if (params.type) sp.set("type", params.type);
    sp.set("before", before);
    return `?${sp.toString()}`;
  };

  return (
    <div>
      <PageHeader eyebrow="Management information" title="Reporting" subtitle="Everything the firm has logged, newest first" />
      <LinkTabs
        className="mb-4"
        tabs={[
          { label: "Management", href: "/reporting", exact: true },
          { label: "Reports", href: "/reporting/reports" },
          { label: "Email marketing", href: "/reporting/email" },
          { label: "Activity feed", href: "/reporting/activity" },
        ]}
      />
      <ActivityFilters team={team ?? []} />

      {(entries ?? []).length === 0 ? (
        <EmptyState className="mt-4" title="Nothing here" body="No journal entries match these filters." />
      ) : (
        <Card className="mt-4">
          <ul className="divide-y divide-line">
            {(entries ?? []).map((e) => {
              const author = e.profiles as unknown as { id: string; full_name: string; calendar_color: string } | null;
              const contact = e.contacts as unknown as { first_name: string | null; last_name: string | null; company_name: string | null } | null;
              const practice = e.practices as unknown as { display_title: string } | null;
              const recordLabel =
                (contact
                  ? [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.company_name
                  : null) ??
                practice?.display_title ??
                (e.deal_id ? "Deal" : null);
              const href = e.contact_id
                ? `/contacts/${e.contact_id}`
                : e.practice_id
                  ? `/practices/${e.practice_id}`
                  : e.deal_id
                    ? `/deals/${e.deal_id}`
                    : "#";
              return (
                <li key={e.id} className="flex items-start gap-3 px-5 py-3">
                  <Avatar name={author?.full_name ?? "System"} size={30} color={author?.calendar_color} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                      <span className="font-bold text-fg-1">{author?.full_name ?? "System"}</span>
                      <Badge className="capitalize">{e.entry_type}</Badge>
                      {recordLabel ? (
                        <Link href={href} className="font-semibold text-gold-deep hover:underline">
                          {recordLabel}
                        </Link>
                      ) : null}
                      <span className="text-xs text-fg-4" title={formatDateTime(e.occurred_at)}>
                        {relativeTime(e.occurred_at)}
                      </span>
                    </p>
                    {(e.subject ?? e.body) ? (
                      <p className="mt-0.5 line-clamp-2 text-sm text-fg-2">{e.subject ?? e.body}</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
          {last && (entries?.length ?? 0) === PAGE_SIZE ? (
            <div className="border-t border-line px-5 py-3 text-center">
              <Link href={`/reporting/activity${qs(last.occurred_at)}`}>
                <Button variant="outline" size="sm">Older entries</Button>
              </Link>
            </div>
          ) : null}
        </Card>
      )}
    </div>
  );
}
