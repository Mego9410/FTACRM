import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { contactName } from "@/lib/contact-helpers";
import { PageHeader } from "@/components/shell/page-header";
import { Badge, Card, EmptyState, LookupPill } from "@/components/ui/primitives";
import { MatchedBuyers } from "@/components/matching/matched-buyers";
import { getMatchingPractices } from "@/lib/matching/queries";
import { formatGBP } from "@/lib/utils";
import { MatchPicker } from "./match-picker";

export const metadata = { title: "Matching" };

export default async function MatchingPage({
  searchParams,
}: {
  searchParams: Promise<{ practice?: string; buyer?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  let subject: { kind: "practice" | "buyer"; id: string; label: string } | null = null;
  if (params.practice) {
    const { data } = await supabase
      .from("practices")
      .select("id, display_title, ref")
      .eq("id", params.practice)
      .maybeSingle();
    if (data) subject = { kind: "practice", id: data.id, label: `${data.display_title} (${data.ref})` };
  } else if (params.buyer) {
    const { data } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, company_name")
      .eq("id", params.buyer)
      .maybeSingle();
    if (data) subject = { kind: "buyer", id: data.id, label: contactName(data) };
  }

  return (
    <div>
      <PageHeader
        eyebrow="Intelligence" title="Matching"
        subtitle="Pick a practice to find its buyers, or a buyer to find their practices"
      />
      <MatchPicker current={subject} />
      <div className="mt-5">
        {!subject ? (
          <EmptyState
            title="Choose a starting point"
            body="Search above for a practice or a buyer — matches are ranked by how well they fit."
          />
        ) : subject.kind === "practice" ? (
          <MatchedBuyers practiceId={subject.id} />
        ) : (
          <BuyerMatches contactId={subject.id} />
        )}
      </div>
    </div>
  );
}

async function BuyerMatches({ contactId }: { contactId: string }) {
  const rows = await getMatchingPractices(contactId);
  if (rows.length === 0) {
    return (
      <EmptyState
        title="No matching practices"
        body="Nothing currently available fits this buyer's criteria. Widen their price range or areas, or check back after the next instruction."
      />
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((r) => (
        <Link key={r.practice_id} href={`/practices/${r.practice_id}`}>
          <Card className="flex h-full flex-col bg-surface-3 p-4 transition-shadow hover:shadow-md">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold-tint text-xs font-extrabold text-gold-deep">
                {r.score}
              </span>
              {r.funding ? <LookupPill color={r.funding.color}>{r.funding.value}</LookupPill> : null}
              {r.excluded ? <Badge>Marked not suitable</Badge> : null}
            </div>
            <p className="font-bold leading-snug text-fg-1">{r.display_title}</p>
            <p className="mt-0.5 text-xs text-fg-3">
              {[r.ref, r.town, r.surgeries ? `${r.surgeries} surgeries` : null].filter(Boolean).join(" · ")}
            </p>
            <p className="mt-1 flex flex-wrap gap-1 text-xs text-fg-3">
              {r.facets.map((f) => (
                <span key={f} className="rounded-full bg-surface-2 px-2 py-0.5">{f}</span>
              ))}
            </p>
            <p className="mt-auto pt-3 text-[17px] font-extrabold text-gold-deep">
              {r.asking_price ? formatGBP(r.asking_price) : "POA"}
            </p>
          </Card>
        </Link>
      ))}
    </div>
  );
}
