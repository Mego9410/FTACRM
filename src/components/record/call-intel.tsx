"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronUp, Copy, Mail, Sparkles, X } from "lucide-react";
import { Badge, Button } from "@/components/ui/primitives";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/utils";
import { acceptSuggestion, dismissSuggestion } from "@/lib/actions/ai-suggestions";

export type CallInfo = {
  transcript: string | null;
  summary: string | null;
  duration_secs: number | null;
  analysed: boolean;
  verify_contact: boolean;
};

export type Suggestion = {
  id: string;
  kind: "task" | "note" | "email_draft" | "outreach";
  payload: Record<string, unknown>;
};

/** AI call intelligence block rendered inside a journal call entry:
 *  labelled summary, expandable transcript, and accept/dismiss suggestions. */
export function CallIntel({
  call,
  suggestions,
  path,
}: {
  call: CallInfo | null;
  suggestions: Suggestion[];
  path: string;
}) {
  const router = useRouter();
  const [showTranscript, setShowTranscript] = React.useState(false);
  const [draftOpen, setDraftOpen] = React.useState<Suggestion | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  if (!call && suggestions.length === 0) return null;

  async function resolve(s: Suggestion, accept: boolean) {
    setBusyId(s.id);
    const res = accept
      ? await acceptSuggestion({ id: s.id, path })
      : await dismissSuggestion({ id: s.id, path });
    setBusyId(null);
    if (!res.ok) window.alert(res.error);
    setDraftOpen(null);
    router.refresh();
  }

  const draftPayload = draftOpen?.payload as { subject?: string; body?: string } | undefined;

  return (
    <div className="mt-2 space-y-2">
      {call?.analysed ? (
        <Badge tone="gold" className="gap-1">
          <Sparkles size={11} /> AI summary from recording
        </Badge>
      ) : null}

      {call?.transcript ? (
        <div>
          <button
            type="button"
            onClick={() => setShowTranscript((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-gold-deep hover:underline"
          >
            {showTranscript ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {showTranscript ? "Hide transcript" : "Show transcript"}
          </button>
          {showTranscript ? (
            <pre className="mt-1.5 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-sm border border-line bg-surface-2 p-3 font-sans text-[13px] leading-relaxed text-fg-2">
              {call.transcript}
            </pre>
          ) : null}
        </div>
      ) : null}

      {suggestions.length > 0 ? (
        <div className="rounded-sm border border-gold/40 bg-gold-tint/40 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-gold-deep">
            <Sparkles size={12} /> Suggested by AI — nothing happens until you approve
          </p>
          <ul className="space-y-2">
            {suggestions.map((s) => {
              const p = s.payload as { title?: string; details?: string; due_at?: string; subject?: string };
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-2 rounded-[10px] bg-surface px-3 py-2">
                  <div className="min-w-0 flex-1">
                    {s.kind === "task" ? (
                      <>
                        <p className="text-sm font-semibold text-fg-1">{p.title ?? "Follow-up task"}</p>
                        <p className="text-xs text-fg-3">
                          {[p.due_at ? `Due ${formatDateTime(p.due_at)}` : "No due date", p.details]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </>
                    ) : s.kind === "email_draft" ? (
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-fg-1">
                        <Mail size={13} className="text-fg-3" /> Draft follow-up: {p.subject ?? "email"}
                      </p>
                    ) : (
                      <p className="text-sm font-semibold text-fg-1">{p.title ?? s.kind}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    {s.kind === "email_draft" ? (
                      <Button variant="outline" size="sm" onClick={() => setDraftOpen(s)}>
                        View draft
                      </Button>
                    ) : (
                      <Button size="sm" disabled={busyId === s.id} onClick={() => void resolve(s, true)}>
                        <Check size={13} /> {s.kind === "task" ? "Create task" : "Accept"}
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" disabled={busyId === s.id} onClick={() => void resolve(s, false)} title="Dismiss">
                      <X size={13} />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <Dialog open={!!draftOpen} onClose={() => setDraftOpen(null)} title="AI draft follow-up" wide>
        {draftPayload ? (
          <div className="space-y-3">
            <p className="text-sm font-bold text-fg-1">{draftPayload.subject}</p>
            <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-sm border border-line bg-surface-2 p-4 font-sans text-sm leading-relaxed text-fg-2">
              {draftPayload.body}
            </pre>
            <p className="text-xs text-fg-3">
              Copy this into your email client and edit before sending — the CRM never sends it for you.
            </p>
            <DialogFooter>
              <Button variant="ghost" onClick={() => draftOpen && void resolve(draftOpen, false)}>
                Dismiss
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  void navigator.clipboard.writeText(`${draftPayload.subject}\n\n${draftPayload.body}`);
                }}
              >
                <Copy size={14} /> Copy draft
              </Button>
              <Button onClick={() => draftOpen && void resolve(draftOpen, true)}>Mark handled</Button>
            </DialogFooter>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
