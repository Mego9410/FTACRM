"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ListTodo, Mail, Megaphone, Sparkles, X } from "lucide-react";
import { Button, Card, CardHeader } from "@/components/ui/primitives";
import { relativeTime } from "@/lib/utils";
import { acceptSuggestion, dismissSuggestion } from "@/lib/actions/ai-suggestions";

type Row = {
  id: string;
  kind: "task" | "note" | "email_draft" | "outreach";
  payload: Record<string, unknown>;
  created_at: string;
  context: string | null;
  href: string;
};

const KIND_ICON: Record<Row["kind"], React.ReactNode> = {
  task: <ListTodo size={14} className="text-gold-deep" />,
  note: <Sparkles size={14} className="text-gold-deep" />,
  email_draft: <Mail size={14} className="text-gold-deep" />,
  outreach: <Megaphone size={14} className="text-gold-deep" />,
};

export function SuggestionsWidgetClient({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = React.useState<string | null>(null);

  if (rows.length === 0) return null;

  function label(r: Row): string {
    const p = r.payload as { title?: string; subject?: string; buyers?: unknown[] };
    if (r.kind === "task") return p.title ?? "Follow-up task";
    if (r.kind === "email_draft") return `Draft follow-up: ${p.subject ?? "email"}`;
    if (r.kind === "outreach")
      return `${(p.buyers as unknown[] | undefined)?.length ?? 0} matched buyers ready to contact`;
    return p.title ?? "Suggestion";
  }

  return (
    <Card className="border-gold/40">
      <CardHeader
        title={
          <span className="flex items-center gap-1.5">
            <Sparkles size={15} className="text-gold-deep" /> AI assistant — for your review
          </span>
        }
      />
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 sm:px-5">
            {KIND_ICON[r.kind]}
            <div className="min-w-0 flex-1">
              <Link href={r.href} className="block truncate text-sm font-semibold text-fg-1 hover:underline">
                {label(r)}
              </Link>
              <p className="text-xs text-fg-3">
                {[r.context, relativeTime(r.created_at)].filter(Boolean).join(" · ")}
              </p>
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
                  <Check size={13} /> Create task
                </Button>
              ) : (
                <Link href={r.href}>
                  <Button variant="outline" size="sm">Review</Button>
                </Link>
              )}
              <Button
                variant="ghost"
                size="sm"
                title="Dismiss"
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
    </Card>
  );
}
