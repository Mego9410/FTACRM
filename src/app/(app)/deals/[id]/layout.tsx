import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { contactName } from "@/lib/contact-helpers";
import { LinkTabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/primitives";
import { StageTracker, type StageState } from "@/components/deals/stage-tracker";
import { formatGBP, relativeTime } from "@/lib/utils";

export default async function DealLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: deal }, { data: stages }, { data: events }] = await Promise.all([
    supabase
      .from("deals")
      .select(
        `id, ref, status, agreed_price, target_completion_date, last_activity_at, completed_at,
         practices!deals_practice_id_fkey(id, display_title, ref),
         buyer:contacts!deals_buyer_contact_id_fkey(id, first_name, last_name, company_name),
         seller:contacts!deals_seller_contact_id_fkey(id, first_name, last_name, company_name)`,
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("deal_stages").select("id, label, sort_order").order("sort_order"),
    supabase.from("deal_stage_events").select("stage_id, achieved_on").eq("deal_id", id),
  ]);
  if (!deal) notFound();

  const stageStates: StageState[] = (stages ?? []).map((s) => ({
    id: s.id,
    label: s.label,
    sort_order: s.sort_order,
    achieved_on: (events ?? []).find((e) => e.stage_id === s.id)?.achieved_on ?? null,
  }));

  const practice = deal.practices as unknown as { id: string; display_title: string; ref: string } | null;
  const buyer = deal.buyer as unknown as { id: string; first_name: string | null; last_name: string | null; company_name: string | null } | null;
  const seller = deal.seller as unknown as { id: string; first_name: string | null; last_name: string | null; company_name: string | null } | null;

  const base = `/deals/${id}`;
  return (
    <div>
      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[24px] font-extrabold tracking-tight text-fg-1">
            {practice?.display_title ?? deal.ref}
          </h1>
          {deal.status === "in_progress" ? <Badge tone="gold">In progress</Badge> : null}
          {deal.status === "completed" ? <Badge tone="green">Completed</Badge> : null}
          {deal.status === "fallen_through" ? <Badge tone="danger">Fallen through</Badge> : null}
          {deal.status === "on_hold" ? <Badge tone="warn">On hold</Badge> : null}
          <span className="text-[18px] font-extrabold text-gold-deep">{formatGBP(deal.agreed_price)}</span>
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-fg-3">
          <span>{deal.ref}</span>
          {practice ? (
            <Link href={`/practices/${practice.id}`} className="font-semibold text-gold-deep hover:underline">
              {practice.ref}
            </Link>
          ) : null}
          {buyer ? (
            <span>
              Buyer:{" "}
              <Link href={`/contacts/${buyer.id}`} className="font-semibold text-gold-deep hover:underline">
                {contactName(buyer)}
              </Link>
            </span>
          ) : null}
          {seller ? (
            <span>
              Seller:{" "}
              <Link href={`/contacts/${seller.id}`} className="font-semibold text-gold-deep hover:underline">
                {contactName(seller)}
              </Link>
            </span>
          ) : null}
          <span>Last activity {relativeTime(deal.last_activity_at)}</span>
          {deal.target_completion_date ? <span>Target completion {deal.target_completion_date}</span> : null}
        </p>
      </div>
      {stageStates.length ? (
        <div className="mb-5 rounded-lg border border-line bg-surface-1 px-5 pb-4 pt-3.5">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-fg-4">Sales progression</p>
          <StageTracker stages={stageStates} size="lg" dealStatus={deal.status} />
        </div>
      ) : null}
      <LinkTabs
        className="mb-5"
        tabs={[
          { label: "Progression", href: base, exact: true },
          { label: "People", href: `${base}/people` },
          { label: "Journal", href: `${base}/journal` },
          { label: "Documents", href: `${base}/documents` },
          { label: "Checklists", href: `${base}/checklist` },
          { label: "Audit", href: `${base}/audit` },
        ]}
      />
      {children}
    </div>
  );
}
