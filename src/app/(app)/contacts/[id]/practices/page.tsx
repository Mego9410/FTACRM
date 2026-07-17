import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { PRACTICE_ROLE_LABELS, PRACTICE_STATUS_LABELS, PRACTICE_STATUS_TONES } from "@/lib/contact-helpers";
import { formatGBP } from "@/lib/utils";

export default async function ContactPracticesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: links } = await supabase
    .from("practice_contacts")
    .select(
      "id, role, is_primary, created_at, practices!practice_contacts_practice_id_fkey(id, ref, display_title, town, status, asking_price)",
    )
    .eq("contact_id", id)
    .order("created_at", { ascending: false });

  if (!links || links.length === 0) {
    return (
      <EmptyState
        title="Not linked to any practices"
        body="Link this contact from a practice's People tab — as a seller, buyer or professional."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {links.map((l) => {
        const p = l.practices as unknown as {
          id: string;
          ref: string;
          display_title: string;
          town: string | null;
          status: string;
          asking_price: number | null;
        } | null;
        if (!p) return null;
        return (
          <Link key={l.id} href={`/practices/${p.id}`}>
            <Card className="h-full bg-surface-3 p-4 transition-shadow hover:shadow-md">
              <div className="mb-2 flex items-center gap-2">
                <Badge tone={PRACTICE_STATUS_TONES[p.status] ?? "neutral"}>
                  {PRACTICE_STATUS_LABELS[p.status] ?? p.status}
                </Badge>
                <Badge tone="gold">{PRACTICE_ROLE_LABELS[l.role] ?? l.role}</Badge>
                {l.is_primary ? <Badge>Primary</Badge> : null}
              </div>
              <p className="font-bold text-fg-1">{p.display_title}</p>
              <p className="text-xs text-fg-3">{[p.ref, p.town].filter(Boolean).join(" · ")}</p>
              {p.asking_price ? (
                <p className="mt-2 text-[15px] font-extrabold text-gold-deep">{formatGBP(p.asking_price)}</p>
              ) : null}
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
