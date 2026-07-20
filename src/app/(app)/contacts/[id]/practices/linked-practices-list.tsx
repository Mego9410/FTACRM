"use client";

import Link from "next/link";
import { Badge, Card } from "@/components/ui/primitives";
import { useClientSort, SortSelect } from "@/components/ui/sortable";
import { PRACTICE_ROLE_LABELS, PRACTICE_STATUS_LABELS, PRACTICE_STATUS_TONES } from "@/lib/contact-helpers";
import { formatGBP } from "@/lib/utils";

type Practice = {
  id: string;
  ref: string;
  display_title: string;
  town: string | null;
  status: string;
  asking_price: number | null;
} | null;

export type LinkedPractice = {
  id: string;
  role: string;
  is_primary: boolean;
  created_at: string;
  practices: Practice;
};

const SORT_OPTIONS = [
  { key: "linked", label: "Linked date" },
  { key: "title", label: "Practice title" },
  { key: "price", label: "Price" },
  { key: "status", label: "Status" },
];

export function LinkedPracticesList({ links }: { links: LinkedPractice[] }) {
  const { sorted, key, dir, set } = useClientSort<LinkedPractice>(
    links,
    {
      linked: (l) => l.created_at,
      title: (l) => (l.practices as unknown as { display_title?: string } | null)?.display_title ?? null,
      price: (l) => (l.practices as unknown as { asking_price?: number | null } | null)?.asking_price ?? null,
      status: (l) => (l.practices as unknown as { status?: string } | null)?.status ?? null,
    },
    { key: "linked", dir: "desc" },
  );

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <SortSelect options={SORT_OPTIONS} sortKey={key} dir={dir} onChange={set} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((l) => {
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
    </div>
  );
}
