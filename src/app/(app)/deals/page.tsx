import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { Badge, Button, Card, EmptyState } from "@/components/ui/primitives";
import { StageChevrons } from "@/components/deals/stage-chevrons";
import { contactName } from "@/lib/contact-helpers";
import { practiceLabel } from "@/lib/practice-helpers";
import { daysSince, formatDate, formatGBP } from "@/lib/utils";
import { DealFilters } from "./deal-filters";
import { SavedViews } from "@/components/shell/saved-views";
import { ExportButton } from "@/components/shell/export-button";
import { SelectionProvider, RowCheck } from "@/components/shell/bulk-select";
import { DealsSelectAll, DealsBulkBar } from "./deals-bulk";
import { exportDealsCsv } from "./csv-actions";

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
    // Match against the deal ref and — via the records the card shows — the
    // practice (trading name, marketing title, town, county, postcode) and the
    // buyer/seller names.
    const [{ data: pracRows }, { data: contactRows }] = await Promise.all([
      supabase
        .from("practices")
        .select("id")
        .or(`name.ilike.${like},display_title.ilike.${like},town.ilike.${like},county.ilike.${like},postcode.ilike.${like}`),
      supabase
        .from("contacts")
        .select("id")
        .or(`first_name.ilike.${like},last_name.ilike.${like},company_name.ilike.${like}`),
    ]);
    const pids = (pracRows ?? []).map((p) => p.id);
    const cids = (contactRows ?? []).map((c) => c.id);
    const orParts = [`ref.ilike.${like}`];
    if (pids.length) orParts.push(`practice_id.in.(${pids.join(",")})`);
    if (cids.length) orParts.push(`buyer_contact_id.in.(${cids.join(",")})`, `seller_contact_id.in.(${cids.join(",")})`);
    query = query.or(orParts.join(","));
  }

  const sort = params.sort ?? "activity";
  if (sort === "price") query = query.order("agreed_price", { ascending: false });
  else if (sort === "target") query = query.order("target_completion_date", { ascending: true, nullsFirst: false });
  else if (sort === "oldest") query = query.order("created_at", { ascending: true });
  else query = query.order("last_activity_at", { ascending: true });

  const { data: deals, count } = await query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const dealIds = (deals ?? []).map((d) => d.id);

  return (
    <SelectionProvider>
    <div>
      <PageHeader
        eyebrow="Pipeline"
        title="Sales progression"
        subtitle="Every transaction from accepted offer to completion"
        actions={<ExportButton action={exportDealsCsv} paramKeys={["status", "stalled"]} />}
      />

      <LinkTabs
        className="mb-4"
        tabs={[
          { label: "In progress", href: "/deals", count: liveCount, exact: true },
          { label: "Completed", href: "/deals?status=completed", count: completedCount },
          { label: "Fallen through", href: "/deals?status=fallen_through", count: fellCount },
          { label: "All", href: "/deals?status=all", count: allCount },
        ]}
      />

      <div className="flex flex-wrap items-start justify-between gap-2">
        <DealFilters />
        <div className="flex items-center gap-2">
          {dealIds.length > 0 ? <DealsSelectAll ids={dealIds} /> : null}
          <SavedViews entity="deals" />
        </div>
      </div>

      {(deals ?? []).length === 0 ? (
        <EmptyState
          className="mt-4"
          title={params.q ? "No deals match your search" : "No deals here"}
          body={
            params.q
              ? "Try a different practice, buyer, seller or reference."
              : "Deals are created automatically when an offer is accepted on a practice."
          }
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
            const completed = d.status === "completed";
            return (
              <div key={d.id} className="relative">
                <label className="absolute left-3 top-4 z-10 flex items-center rounded bg-surface/95 p-0.5 shadow-sm" onClick={(e) => e.stopPropagation()}>
                  <RowCheck id={d.id} />
                </label>
                <Link href={`/deals/${d.id}`} className="block">
                <Card className="overflow-hidden rounded-[18px] p-0 transition-all hover:-translate-y-[2px] hover:shadow-md">
                  <div className="flex items-start justify-between gap-3 pl-12 pr-6 pt-5">
                    <div className="min-w-0">
                      <p className="truncate text-[16px] font-extrabold tracking-tight text-fg-1">{headerBits.join(" – ")}</p>
                      {buyer || seller ? (
                        <p className="mt-1 truncate text-[13px] text-fg-3">
                          {buyer ? (
                            <>Buyer: <span className="font-semibold text-gold-deep">{contactName(buyer)}</span></>
                          ) : null}
                          {buyer && seller ? " · " : null}
                          {seller ? (
                            <>Seller: <span className="font-semibold text-gold-deep">{contactName(seller)}</span></>
                          ) : null}
                        </p>
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
                  <div className="overflow-x-auto px-6 pb-5 pt-4">
                    <div className="min-w-[720px]">
                      <StageChevrons stages={stageStates} dealStatus={d.status} />
                    </div>
                  </div>
                </Card>
                </Link>
              </div>
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
      <DealsBulkBar />
    </div>
    </SelectionProvider>
  );
}
