"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Mail, Megaphone, Sparkles, X } from "lucide-react";
import { Button, EmptyState } from "@/components/ui/primitives";
import { relativeTime } from "@/lib/utils";
import { acceptSuggestion, dismissSuggestion } from "@/lib/actions/ai-suggestions";

export type AiWidgetRow = {
  id: string;
  kind: "task" | "note" | "email_draft" | "outreach";
  title: string;
  context: string | null;
  href: string;
  createdAt: string;
};

export function AiWidget({ rows }: { rows: AiWidgetRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = React.useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState
          className="border-0 bg-transparent"
          icon={<Sparkles size={20} />}
          title="No AI suggestions"
          body="Captured calls and new instructions surface actions here."
        />
      </div>
    );
  }
  const icon = (k: AiWidgetRow["kind"]) =>
    k === "email_draft" ? <Mail size={13} /> : k === "outreach" ? <Megaphone size={13} /> : <Sparkles size={13} />;

  return (
    <ul className="h-full space-y-1.5 overflow-y-auto p-4">
      {rows.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-sm border border-gold/40 bg-gold-tint/40 px-3 py-2">
          <span className="text-gold-deep">{icon(r.kind)}</span>
          <div className="min-w-0 flex-1">
            <Link href={r.href} className="block truncate text-sm font-semibold text-fg-1 hover:underline">
              {r.title}
            </Link>
            <p className="truncate text-[11px] text-fg-3">{[r.context, relativeTime(r.createdAt)].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="flex shrink-0 gap-1">
            {r.kind === "task" ? (
              <Button
                size="sm"
                disabled={busyId === r.id}
                onClick={async () => {
                  setBusyId(r.id);
                  await acceptSuggestion({ id: r.id, path: "/dashboard" });
                  setBusyId(null);
                  router.refresh();
                }}
              >
                <Check size={13} />
              </Button>
            ) : (
              <Link href={r.href}>
                <Button variant="outline" size="sm">Review</Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="sm"
              disabled={busyId === r.id}
              onClick={async () => {
                setBusyId(r.id);
                await dismissSuggestion({ id: r.id, path: "/dashboard" });
                setBusyId(null);
                router.refresh();
              }}
            >
              <X size={13} />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
