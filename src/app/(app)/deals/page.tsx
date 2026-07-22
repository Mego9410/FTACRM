import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { Avatar, Badge, Button, Card, EmptyState } from "@/components/ui/primitives";
import { StageTracker } from "@/components/deals/stage-tracker";
import { contactName } from "@/lib/contact-helpers";
import { daysSince, formatGBP, relativeTime } from "@/lib/utils";
import { DealFilters } from "./deal-filters";

export const metadata = { title: "Sales progression" };

const PAGE_SIZE = 30;
const STALLED_DAYS = 14;

type Search = { status?: string; owner?: string; q?: string; stalled?: string; sort?: string; page?: string };

export default async function DealsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const supabase = await createClient();

  const countFor = async (status?: string) => {
    let q = supabase.from("deals").select("id", { count: "exact", head: true });
    if (status) q = q.eq("status", status);
    const { count } = await q;
    return count ?? 0;
  };
  const [allCount, liveCount, completedCount, fellCount, { data: stages }, { data: owners }] =
    await Promise.all([
      countFor(),
      countFor("in_progress"),
      countFor("completed"),
      countFor("fallen_through"),
      supabase.from("deal_stages").select("id, label, sort_order").order("sort_order"),
      supabase.from("profiles").select("id, full_name").eq("is_active", true).order("full_name"),
    ]);

  let query = supabase.from("deals").select(
    `id, ref, status, agreed_price, target_completion_date, last_activity_at, completed_at,
     practices!deals_practice_id_fkey(id, display_title, town),
     buyer:contacts!deals_buyer_contact_id_fkey(id, first_name, last_name, company_name),
     owner:profiles!deals_owner_id_fkey(id, full_name, calendar_color),
     deal_stage_events(stage_id, achieved_on)`,
    { count: "exact" },
  );

  const status = params.status ?? "in_progress";
  if (status !== "all") query = query.eq("status", status);
  if (params.owner) query = query.eq("owner_id", params.owner);
  if (params.stalled === "1") {
    query = query.lt(
      "last_activity_at",
      new Date(Date.now() - STALLED_DAYS * 86_400_000).toISOString(),
    );
  }
  if (params.q) {
    const like = `%${params.q.replace(/[%_]/g, "")}%`;
    query = query.ilike("ref", like);
  }

  const sort = params.sort ?? "activity";
  if (sort === "price") query = query.order("agreed_price", { ascending: false });
  else if (sort === "target") query = query.order("target_completion_date", { ascending: true, nullsFirst: false });
  else if (sort === "oldest") query = query.order("created_at", { ascending: true });
  else query = query.order("last_activity_at", { ascending: true });

  const { data: deals, count } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div>
      <PageHeader eyebrow="Pipeline" title="Sales progression" subtitle="Every transaction from accepted offer to completion" />

      <LinkTabs
        className="mb-4"
        tabs={[
          { label: "In progress", href: "/deals", count: liveCount, exact: true },
          { label: "Completed", href: "/deals?status=completed", count: completedCount },
          { label: "Fallen through", href: "/deals?status=fallen_through", count: fellCount },
          { label: "All", href: "/deals?status=all", count: allCount },
        ]}
      />

      <DealFilters owners={owners ?? []} />

      {(deals ?? []).length === 0 ? (
        <EmptyState
          className="mt-4"
          title="No deals here"
          body="Deals are created automatically when an offer is accepted on a practice."
        />
      ) : (
        <div className="mt-4 space-y-3">
          {(deals ?? []).map((d) => {
            const practice = d.practices as unknown as { id: string; display_title: string; town: string | null } | null;
            const buyer = d.buyer as unknown as { id: string; first_name: string | null; last_name: string | null; company_name: string | null } | null;
            const owner = d.owner as unknown as { id: string; full_name: string; calendar_color: string } | null;
            const events = (d.deal_stage_events as { stage_id: string; achieved_on: string }[]) ?? [];
            const stageStates = (stages ?? []).map((s) => ({
              ...s,
              achieved_on: events.find((e) => e.stage_id === s.id)?.achieved_on ?? null,
            }));
            const idleDays = daysSince(d.last_activity_at) ?? 0;
            return (
              <Link key={d.id} href={`/deals/${d.id}`} className="block">
                <Card className="flex flex-wrap items-center gap-4 px-5 py-4 transition-shadow hover:shadow-md">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-fg-1">{practice?.display_title ?? d.ref}</span>
                      <span className="text-xs text-fg-4">{d.ref}</span>
                      {d.status === "completed" ? <Badge tone="green">Completed</Badge> : null}
                      {d.status === "fallen_through" ? <Badge tone="danger">Fallen through</Badge> : null}
                      {d.status === "on_hold" ? <Badge tone="warn">On hold</Badge> : null}
                      {d.status === "in_progress" && idleDays >= STALLED_DAYS ? (
                        <Badge tone="danger">No activity {idleDays}d</Badge>
                      ) : d.status === "in_progress" && idleDays >= 7 ? (
                        <Badge tone="warn">Quiet {idleDays}d</Badge>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-fg-3">
                      {[
                        buyer ? `Buyer: ${contactName(buyer)}` : null,
                        formatGBP(d.agreed_price),
                        d.status === "completed"
                          ? `Completed ${d.completed_at ?? ""}`
                          : `Updated ${relativeTime(d.last_activity_at)}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  {owner ? (
                    <Avatar name={owner.full_name} size={28} color={owner.calendar_color} className="order-2 sm:order-3" />
                  ) : null}
                  <div className="order-3 w-full sm:order-2 sm:w-56 sm:shrink-0">
                    <StageTracker stages={stageStates} dealStatus={d.status} />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="mt-5 flex items-center justify-between">
          <p className="text-xs text-fg-3">{count} deals · page {page} of {totalPages}</p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={`/deals?${new URLSearchParams({ ...params, page: String(page - 1) } as Record<string, string>)}`}>
                <Button variant="outline" size="sm">Previous</Button>
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link href={`/deals?${new URLSearchParams({ ...params, page: String(page + 1) } as Record<string, string>)}`}>
                <Button variant="outline" size="sm">Next</Button>
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
