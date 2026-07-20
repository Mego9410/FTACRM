import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getLookupIndex } from "@/lib/lookups";
import { PageHeader } from "@/components/shell/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { Badge, Button, Card, EmptyState, LookupPill } from "@/components/ui/primitives";
import { PRACTICE_STATUS_LABELS, PRACTICE_STATUS_TONES } from "@/lib/contact-helpers";
import { formatGBP } from "@/lib/utils";
import { resolveSort, applySort, type SortOptions } from "@/lib/sort";
import { PracticeFilters } from "./practice-filters";

export const metadata = { title: "Practices" };

const PAGE_SIZE = 24;

const SORT_OPTIONS: SortOptions = {
  recent: { column: "created_at" },
  title: { column: "display_title" },
  price: { column: "asking_price", nullsFirst: false },
  town: { column: "town", nullsFirst: false },
  surgeries: { column: "surgeries", nullsFirst: false },
  status: { column: "status" },
};

type Search = {
  status?: string;
  q?: string;
  owner?: string;
  funding?: string;
  min?: string;
  max?: string;
  page?: string;
  sort?: string;
  dir?: string;
};

export default async function PracticesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const supabase = await createClient();

  const countFor = async (status?: string) => {
    let q = supabase.from("practices").select("id", { count: "exact", head: true }).is("archived_at", null);
    if (status === "live") q = q.in("status", ["available", "under_offer", "sold_stc"]);
    else if (status) q = q.eq("status", status);
    const { count } = await q;
    return count ?? 0;
  };

  const [allCount, valuationCount, liveCount, completedCount, withdrawnCount, { data: owners }, lookupIndex] =
    await Promise.all([
      countFor(),
      countFor("valuation"),
      countFor("live"),
      countFor("completed"),
      countFor("withdrawn"),
      supabase.from("profiles").select("id, full_name").eq("is_active", true).order("full_name"),
      getLookupIndex(),
    ]);

  let query = supabase
    .from("practices")
    .select(
      "id, ref, display_title, town, county, status, asking_price, price_prefix, funding_type_id, tenure_type_id, surgeries, owner_id, contract_expiry, profiles!practices_owner_id_fkey(full_name)",
      { count: "exact" },
    )
    .is("archived_at", null);

  if (params.status === "live") query = query.in("status", ["available", "under_offer", "sold_stc"]);
  else if (params.status) query = query.eq("status", params.status);
  if (params.owner) query = query.eq("owner_id", params.owner);
  if (params.funding) query = query.eq("funding_type_id", params.funding);
  if (params.min) query = query.gte("asking_price", Number(params.min));
  if (params.max) query = query.lte("asking_price", Number(params.max));
  if (params.q) {
    const like = `%${params.q.replace(/[%_]/g, "")}%`;
    query = query.or(
      `display_title.ilike.${like},name.ilike.${like},town.ilike.${like},postcode.ilike.${like},ref.ilike.${like}`,
    );
  }

  const sort = resolveSort(params, SORT_OPTIONS, { key: "recent", dir: "desc" });
  const { data: practices, count } = await applySort(query, sort).range(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE - 1,
  );

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const qs = (extra: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...params, ...extra })) if (v) sp.set(k, v);
    const s = sp.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div>
      <PageHeader
        eyebrow="Instructions" title="Practices"
        subtitle="Every practice from first valuation to completion"
        actions={
          <Link href="/practices/new">
            <Button>New practice</Button>
          </Link>
        }
      />

      <LinkTabs
        className="mb-4"
        tabs={[
          { label: "All", href: "/practices", count: allCount, exact: true },
          { label: "Valuations", href: "/practices?status=valuation", count: valuationCount },
          { label: "Live", href: "/practices?status=live", count: liveCount },
          { label: "Completed", href: "/practices?status=completed", count: completedCount },
          { label: "Withdrawn", href: "/practices?status=withdrawn", count: withdrawnCount },
        ]}
      />

      <PracticeFilters owners={owners ?? []} />

      {(practices ?? []).length === 0 ? (
        <EmptyState
          className="mt-4"
          title="No practices match"
          body="Adjust the filters, or add a practice to begin its journey."
          action={
            <Link href="/practices/new">
              <Button size="sm">New practice</Button>
            </Link>
          }
        />
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(practices ?? []).map((p) => {
            const owner = p.profiles as unknown as { full_name: string } | null;
            const funding = p.funding_type_id ? lookupIndex.get(p.funding_type_id) : null;
            const tenure = p.tenure_type_id ? lookupIndex.get(p.tenure_type_id) : null;
            const expiring =
              p.contract_expiry &&
              !["completed", "withdrawn"].includes(p.status) &&
              new Date(p.contract_expiry) < new Date(Date.now() + 60 * 86_400_000);
            return (
              <Link key={p.id} href={`/practices/${p.id}`}>
                <Card className="flex h-full flex-col bg-surface-3 p-4 transition-shadow hover:shadow-md">
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    <Badge tone={PRACTICE_STATUS_TONES[p.status] ?? "neutral"}>
                      {PRACTICE_STATUS_LABELS[p.status] ?? p.status}
                    </Badge>
                    {funding ? <LookupPill color={funding.color}>{funding.value}</LookupPill> : null}
                    {expiring ? <Badge tone="warn">Contract expiring</Badge> : null}
                  </div>
                  <p className="font-bold leading-snug text-fg-1">{p.display_title}</p>
                  <p className="mt-0.5 text-xs text-fg-3">
                    {[p.ref, p.town, tenure?.value, p.surgeries ? `${p.surgeries} surgeries` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <div className="mt-auto flex items-end justify-between pt-3">
                    <p className="text-[17px] font-extrabold text-gold-deep">
                      {p.asking_price
                        ? `${p.price_prefix === "offers_over" ? "Offers over " : p.price_prefix === "guide" ? "Guide " : ""}${formatGBP(p.asking_price)}`
                        : "POA"}
                    </p>
                    <p className="text-xs text-fg-3">{owner?.full_name ?? "Unassigned"}</p>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="mt-5 flex items-center justify-between">
          <p className="text-xs text-fg-3">{count} practices · page {page} of {totalPages}</p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={`/practices${qs({ page: String(page - 1) })}`}>
                <Button variant="outline" size="sm">Previous</Button>
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link href={`/practices${qs({ page: String(page + 1) })}`}>
                <Button variant="outline" size="sm">Next</Button>
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
