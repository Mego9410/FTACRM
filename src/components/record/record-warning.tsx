"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Pencil, Plus, X } from "lucide-react";
import { Button, Textarea } from "@/components/ui/primitives";
import { SlideOver } from "@/components/ui/slide-over";
import { cn } from "@/lib/utils";
import { setRecordWarning } from "@/lib/records/warning-actions";

type WarningTable = "contacts" | "practices";

const LABEL: Record<WarningTable, string> = {
  contacts: "Contact warning",
  practices: "Property warning",
};

/**
 * A pinned free-text warning for a record, styled after the legacy CRM:
 * a persistent red "Warning" pill in the header opens a bright yellow alert
 * card with a red badge. Auto-opens on load; the pill re-opens it any time.
 *
 * - "header" (default): pill + dismissible card.
 * - "pinned": always-visible card (no dismiss) — for the journal / notes top.
 */
export function RecordWarning({
  table,
  id,
  warning,
  variant = "header",
  canEdit = true,
  bare = false,
}: {
  table: WarningTable;
  id: string;
  warning: string | null;
  variant?: "header" | "pinned";
  canEdit?: boolean;
  /** Drop the bottom margin so this can sit inside a flex row with siblings. */
  bare?: boolean;
}) {
  const router = useRouter();
  const pinned = variant === "pinned";
  const [open, setOpen] = React.useState(Boolean(warning));
  const [editing, setEditing] = React.useState(false);
  const [text, setText] = React.useState(warning ?? "");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setText(warning ?? "");
    if (!pinned) setOpen(Boolean(warning));
  }, [warning, pinned]);

  async function save(next: string | null) {
    setBusy(true);
    setError(null);
    const res = await setRecordWarning({ table, id, warning: next });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setEditing(false);
    router.refresh();
  }

  const card =
    warning && (pinned || open) ? (
      <div className="flex items-start gap-3 rounded-lg border border-warn/40 bg-warn-bg px-4 py-3.5 shadow-xs">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-danger text-[15px] font-black leading-none text-white">
          !
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold tracking-tight text-fg-1">Warning</p>
          <p className="mt-0.5 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-fg-2">{warning}</p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {canEdit ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-md p-1.5 text-fg-3 transition-colors hover:bg-black/5 hover:text-fg-1"
              title="Edit warning"
              aria-label="Edit warning"
            >
              <Pencil size={15} />
            </button>
          ) : null}
          {!pinned ? (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1.5 text-fg-3 transition-colors hover:bg-black/5 hover:text-fg-1"
              title="Dismiss"
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          ) : null}
        </div>
      </div>
    ) : null;

  // Persistent header control — a red pill when a warning exists, otherwise a
  // subtle "Add warning" affordance.
  const control = pinned ? null : warning ? (
    <button
      type="button"
      onClick={() => setOpen((o) => !o)}
      className="inline-flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger-bg px-3 py-1.5 text-[13px] font-bold text-danger transition-colors hover:bg-danger/10"
      title={open ? "Hide warning" : "Show warning"}
    >
      <AlertCircle size={15} /> Warning
    </button>
  ) : canEdit ? (
    <button
      type="button"
      onClick={() => {
        setText("");
        setEditing(true);
      }}
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-semibold text-fg-3 transition-colors hover:border-danger/40 hover:text-danger"
      title="Add a warning"
    >
      <Plus size={15} /> Add warning
    </button>
  ) : null;

  return (
    <div className={cn(!pinned && !bare && (card || control) && "mb-3", (card || control) && "space-y-2")}>
      {control}
      {card}

      <SlideOver open={editing} onClose={() => setEditing(false)} title={LABEL[table]}>
        <div className="space-y-4">
          <p className="text-sm text-fg-2">
            Shows as a warning banner at the top of the record and is pinned to the top of its journal.
            Keep it short and factual — anyone with access will see it.
          </p>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            autoFocus
            placeholder={"e.g. Area: near Greenwich\nSeller is deaf — email only, do not call."}
          />
          {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
          <div className="flex items-center justify-between gap-2">
            {warning ? (
              <Button type="button" variant="ghost" disabled={busy} onClick={() => save(null)} className="text-danger">
                Remove warning
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              <Button type="button" disabled={busy || !text.trim()} onClick={() => save(text)}>
                {busy ? "Saving…" : "Save warning"}
              </Button>
            </div>
          </div>
        </div>
      </SlideOver>
    </div>
  );
}
