import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { Badge, Button, Card, EmptyState } from "@/components/ui/primitives";
import { StageChevrons } from "@/components/deals/stage-chevrons";
import { contactName } from "@/lib/contact-helpers";
import { practiceLabel } from "@/lib/practice-helpers";
import { cn, daysSince, formatDate, formatGBP } from "@/lib/utils";
import { DealFilters } from "./deal-filters";

export const metadata = { title: "Sales progression" };

const PAGE_SIZE = 30;
const STALLED_DAYS = 14;

type Search = { status?: string; q?: string; stalled?: string; sort?: string; page?: string };

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
  const [allCount, liveCount, completedCount, fellCount, { data: stages }] = await Promise.all([
    countFor(),
    countFor("in_progress"),
    countFor("completed"),
    countFor("fallen_through"),
    supabase.from("deal_stages").select("id, label, sort_order").order("sort_order"),
  ]);

  let query = supabase.from("deals").select(
    `id, ref, status, agreed_price, target_completion_date, last_activity_at, completed_at, created_at,
     practices!deals_practice_id_fkey(id, display_title, name, county),
     buyer:contacts!deals_buyer_contact_id_fkey(id, first_name, last_name, company_name),
     seller:contacts!deals_seller_contact_id_fkey(id, first_name, last_name, company_name),
     deal_stage_events(stage_id, achieved_on)`,
    { count: "exact" },
  );

  const status = params.status ?? "in_progress";
  if (status !== "all") query = query.eq("status", status);
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

      <DealFilters />

      {(deals ?? []).length === 0 ? (
        <EmptyState
          className="mt-4"
          title="No deals here"
          body="Deals are created automatically when an offer is accepted on a practice."
        />
      ) : (
        <div className="mt-4 space-y-3">
          {(deals ?? []).map((d) => {
            const practice = d.practices as unknown as {
              id: string;
              display_title: string;
              name: string | null;
              county: string | null;
            } | null;
            const buyer = d.buyer as unknown as { id: string; first_name: string | null; last_name: string | null; company_name: string | null } | null;
            const seller = d.seller as unknown as { id: string; first_name: string | null; last_name: string | null; company_name: string | null } | null;
            const events = (d.deal_stage_events as { stage_id: string; achieved_on: string }[]) ?? [];
            const stageStates = (stages ?? []).map((s) => ({
              ...s,
              achieved_on: events.find((e) => e.stage_id === s.id)?.achieved_on ?? null,
            }));
            const idleDays = daysSince(d.last_activity_at) ?? 0;
            const startDate = stageStates[0]?.achieved_on ?? d.created_at;
            const headerBits = [
              startDate ? formatDate(startDate) : null,
              d.agreed_price != null ? formatGBP(d.agreed_price) : null,
              practice ? practiceLabel(practice) : d.ref,
            ].filter(Boolean);
            const partyBits = [
              buyer ? `Buyer: ${contactName(buyer)}` : null,
              seller ? `Seller: ${contactName(seller)}` : null,
            ].filter(Boolean);
            const completed = d.status === "completed";
            return (
              <Link key={d.id} href={`/deals/${d.id}`} className="block">
                <Card className="overflow-hidden p-0 transition-shadow hover:shadow-md">
                  <div
                    className={cn(
                      "flex items-center justify-between gap-3 border-b border-line px-4 py-2.5",
                      completed ? "bg-available-fg/8" : "bg-surface-2/50",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-fg-1">{headerBits.join(" – ")}</p>
                      {partyBits.length ? (
                        <p className="mt-0.5 truncate text-xs text-fg-3">{partyBits.join(" · ")}</p>
                      ) : null}
                    </div>
                    <div className="shrink-0">
                      {completed ? (
                        <Badge tone="green">Completed</Badge>
                      ) : d.status === "fallen_through" ? (
                        <Badge tone="danger">Fallen through</Badge>
                      ) : (
                        <span className="flex items-center gap-2">
                          {d.status === "on_hold" ? <Badge tone="warn">On hold</Badge> : null}
                          {d.status === "in_progress" && idleDays >= STALLED_DAYS ? (
                            <Badge tone="danger">No activity {idleDays}d</Badge>
                          ) : d.status === "in_progress" && idleDays >= 7 ? (
                            <Badge tone="warn">Quiet {idleDays}d</Badge>
                          ) : null}
                          <span className="hidden text-xs text-fg-4 sm:inline">
                            Last updated: {formatDate(d.last_activity_at)}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="overflow-x-auto p-3">
                    <div className="min-w-[720px]">
                      <StageChevrons stages={stageStates} dealStatus={d.status} />
                    </div>
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
