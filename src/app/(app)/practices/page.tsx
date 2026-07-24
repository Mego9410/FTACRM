import Link from "next/link";
import { LayoutGrid, List } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getLookupIndex } from "@/lib/lookups";
import { PageHeader } from "@/components/shell/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { Badge, Button, Card, EmptyState, LookupPill } from "@/components/ui/primitives";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRACTICE_STATUS_LABELS, PRACTICE_STATUS_TONES } from "@/lib/contact-helpers";
import { cn, formatGBP } from "@/lib/utils";
import { resolveSort, applySort, type SortOptions } from "@/lib/sort";
import { PracticeMapDefs, PracticeMapUse } from "@/components/practices/practice-map";
import { practiceLabel } from "@/lib/practice-helpers";
import { PracticeFilters } from "./practice-filters";
import { SavedViews } from "@/components/shell/saved-views";
import { ExportButton } from "@/components/shell/export-button";
import { SelectionProvider, RowCheck, SelectAll } from "@/components/shell/bulk-select";
import { PracticesBulkBar } from "./practices-bulk";
import { exportPracticesCsv } from "./csv-actions";

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
  funding?: string;
  min?: string;
  max?: string;
  page?: string;
  sort?: string;
  dir?: string;
  view?: string;
  offmarket?: string;
};

export default async function PracticesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const view = params.view === "list" ? "list" : "grid";
  const supabase = await createClient();

  const countFor = async (status?: string) => {
    let q = supabase.from("practices").select("id", { count: "exact", head: true }).is("archived_at", null);
    if (status === "live") q = q.in("status", ["available", "under_offer", "sold_stc"]);
    else if (status) q = q.eq("status", status);
    const { count } = await q;
    return count ?? 0;
  };

  const [allCount, valuationCount, liveCount, completedCount, withdrawnCount, lookupIndex] =
    await Promise.all([
      countFor(),
      countFor("valuation"),
      countFor("live"),
      countFor("completed"),
      countFor("withdrawn"),
      getLookupIndex(),
    ]);

  let query = supabase
    .from("practices")
    // `*` keeps this tolerant of the headline_image_path column being un-migrated.
    .select("*", { count: "exact" })
    .is("archived_at", null);

  const showOffMarket = params.offmarket === "1";
  if (params.status === "live") query = query.in("status", ["available", "under_offer", "sold_stc"]);
  else if (params.status) query = query.eq("status", params.status);
  // Default: hide practices no longer on the market (withdrawn / completed) unless
  // the user ticks to show them, or is explicitly viewing one of those tabs.
  else if (!showOffMarket) query = query.not("status", "in", "(withdrawn,completed)");
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

  // One batch of signed URLs for the practices on this page that have a photo.
  const headlinePaths = (practices ?? [])
    .map((p) => (p as { headline_image_path?: string | null }).headline_image_path)
    .filter((x): x is string => Boolean(x));
  const urlByPath = new Map<string, string>();
  if (headlinePaths.length > 0) {
    const { data: signed } = await createAdminClient().storage.from("documents").createSignedUrls(headlinePaths, 60 * 60);
    for (const s of signed ?? []) if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
  }
  const anyMap = (practices ?? []).some(
    (p) => !(p as { headline_image_path?: string | null }).headline_image_path,
  );

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const qs = (extra: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...params, ...extra })) if (v) sp.set(k, v);
    const s = sp.toString();
    return s ? `?${s}` : "";
  };

  const practiceIds = (practices ?? []).map((p) => p.id);

  return (
    <SelectionProvider>
    <div>
      <PageHeader
        eyebrow="Instructions" title="Practices"
        subtitle="Every practice from first valuation to completion"
        actions={
          <div className="flex items-center gap-2">
            <ExportButton action={exportPracticesCsv} paramKeys={["q", "status", "funding", "min", "max", "offmarket"]} />
            <Link href="/practices/new">
              <Button>New practice</Button>
            </Link>
          </div>
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

      <div className="flex flex-wrap items-start justify-between gap-2">
        <PracticeFilters />
        <SavedViews entity="practices" />
      </div>

      <div className="mt-4 flex items-center justify-end">
        <div className="inline-flex gap-1 rounded-[12px] bg-surface-2 p-1">
          <Link
            href={`/practices${qs({ view: undefined })}`}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-[13px] font-semibold transition-colors",
              view === "grid" ? "bg-surface text-ink shadow-xs" : "text-fg-3 hover:text-fg-1",
            )}
          >
            <LayoutGrid size={14} /> Grid
          </Link>
          <Link
            href={`/practices${qs({ view: "list" })}`}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-[13px] font-semibold transition-colors",
              view === "list" ? "bg-surface text-ink shadow-xs" : "text-fg-3 hover:text-fg-1",
            )}
          >
            <List size={14} /> List
          </Link>
        </div>
      </div>

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
      ) : view === "list" ? (
        <Card className="mt-4 overflow-hidden">
          <div className="overflow-x-auto">
            {anyMap ? <PracticeMapDefs /> : null}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-left text-[10.5px] font-bold uppercase tracking-[0.08em] text-fg-4">
                  <th className="w-10 pl-5 py-3"><SelectAll ids={practiceIds} /></th>
                  <th className="w-[60px] py-3" />
                  <th className="py-3 pr-3">Practice</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Funding</th>
                  <th className="px-3 py-3">Town</th>
                  <th className="px-3 py-3">Surgeries</th>
                  <th className="px-3 py-3 text-right">Guide</th>
                </tr>
              </thead>
              <tbody>
                {(practices ?? []).map((p) => {
                  const funding = p.funding_type_id ? lookupIndex.get(p.funding_type_id) : null;
                  const headlinePath = (p as { headline_image_path?: string | null }).headline_image_path ?? null;
                  const photoUrl = headlinePath ? urlByPath.get(headlinePath) ?? null : null;
                  const guide = p.asking_price
                    ? `${p.price_prefix === "offers_over" ? "Offers over " : p.price_prefix === "guide" ? "Guide " : ""}${formatGBP(p.asking_price)}`
                    : "POA";
                  return (
                    <tr key={p.id} className="cursor-pointer border-t border-line hover:bg-gold-tint">
                      <td className="pl-5 py-3"><RowCheck id={p.id} /></td>
                      <td className="py-3 pr-0">
                        <Link href={`/practices/${p.id}`} className="block">
                          <span className="flex h-11 w-14 items-center justify-center overflow-hidden rounded-md border border-line bg-surface-3">
                            {photoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={photoUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <PracticeMapUse
                                lat={(p as { lat?: number | null }).lat ?? null}
                                lng={(p as { lng?: number | null }).lng ?? null}
                                className="max-h-full w-auto p-1"
                              />
                            )}
                          </span>
                        </Link>
                      </td>
                      <td className="py-4 pl-3 pr-3">
                        <Link href={`/practices/${p.id}`} className="block">
                          <span className="font-semibold text-fg-1">{practiceLabel(p)}</span>
                          <span className="mt-0.5 block text-xs text-fg-3">{p.ref}</span>
                        </Link>
                      </td>
                      <td className="px-3 py-4">
                        <Badge tone={PRACTICE_STATUS_TONES[p.status] ?? "neutral"}>
                          {PRACTICE_STATUS_LABELS[p.status] ?? p.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-4">
                        {funding ? <LookupPill color={funding.color}>{funding.value}</LookupPill> : <span className="text-fg-4">—</span>}
                      </td>
                      <td className="px-3 py-4 text-fg-2">{p.town ?? "—"}</td>
                      <td className="px-3 py-4 text-fg-2">{p.surgeries ?? "—"}</td>
                      <td className="px-3 py-4 text-right font-extrabold text-gold-deep">{guide}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {anyMap ? <PracticeMapDefs /> : null}
          {(practices ?? []).map((p) => {
            const funding = p.funding_type_id ? lookupIndex.get(p.funding_type_id) : null;
            const tenure = p.tenure_type_id ? lookupIndex.get(p.tenure_type_id) : null;
            const headlinePath = (p as { headline_image_path?: string | null }).headline_image_path ?? null;
            const photoUrl = headlinePath ? urlByPath.get(headlinePath) ?? null : null;
            const guide = p.asking_price
              ? `${p.price_prefix === "offers_over" ? "Offers over " : p.price_prefix === "guide" ? "Guide " : ""}${formatGBP(p.asking_price)}`
              : "POA";
            return (
              <Link key={p.id} href={`/practices/${p.id}`} className="group block h-full">
                {/* Square instruction card: map panel + details on top, full-width price/footer below. */}
                <Card className="flex aspect-[3/2] flex-col overflow-hidden rounded-[20px] p-0 transition-all group-hover:-translate-y-[3px] group-hover:shadow-md">
                  <div className="flex min-h-0 flex-1">
                    <div className="relative w-[132px] shrink-0 self-stretch overflow-hidden border-r border-line bg-surface-3">
                      {photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <>
                          <div className="flex h-full w-full items-center justify-center">
                            <PracticeMapUse
                              lat={(p as { lat?: number | null }).lat ?? null}
                              lng={(p as { lng?: number | null }).lng ?? null}
                              className="max-h-full w-auto p-2"
                            />
                          </div>
                          <span className="pointer-events-none absolute inset-x-0 bottom-2.5 px-2 text-center text-[9px] leading-tight text-fg-4">
                            Auto-generated map
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-3 p-5">
                      <div className="flex flex-wrap gap-1.5">
                        <Badge tone={PRACTICE_STATUS_TONES[p.status] ?? "neutral"}>
                          {PRACTICE_STATUS_LABELS[p.status] ?? p.status}
                        </Badge>
                        {funding ? <LookupPill color={funding.color}>{funding.value}</LookupPill> : null}
                      </div>
                      <p className="text-[16.5px] font-extrabold leading-snug tracking-tight text-fg-1">{practiceLabel(p)}</p>
                      <p className="text-xs leading-relaxed text-fg-3">
                        {[p.ref, p.town, tenure?.value, p.surgeries ? `${p.surgeries} surgeries` : null]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-4">
                    <span className="text-[20px] font-extrabold tracking-tight text-gold-deep">{guide}</span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-bold text-gold-deep">
                      Details <span aria-hidden>→</span>
                    </span>
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
      {view === "list" ? <PracticesBulkBar /> : null}
    </div>
    </SelectionProvider>
  );
}
