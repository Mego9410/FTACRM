"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Mail, MessageSquare, Phone, Pin, StickyNote, Trash2, Zap } from "lucide-react";
import { cn, formatDateTime, relativeTime } from "@/lib/utils";
import type { LookupValue } from "@/lib/lookups";
import { Avatar, Badge, Button, EmptyState, Select, Textarea } from "@/components/ui/primitives";
import { createJournalEntry, deleteJournalEntry, togglePin } from "@/lib/actions/journal";

type Entry = {
  id: string;
  entry_type: string;
  subject: string | null;
  body: string | null;
  author: { full_name: string; calendar_color: string } | null;
  author_id: string | null;
  call_outcome_id: string | null;
  call_direction: string | null;
  pinned: boolean;
  occurred_at: string;
};

const TYPE_ICON: Record<string, React.ReactNode> = {
  call: <Phone size={14} />,
  note: <StickyNote size={14} />,
  email: <Mail size={14} />,
  sms: <MessageSquare size={14} />,
  system: <Zap size={14} />,
  file: <StickyNote size={14} />,
};

export function JournalClient({
  entries,
  outcomes,
  link,
  path,
}: {
  entries: Entry[];
  outcomes: LookupValue[];
  link: { contact_id: string | null; practice_id: string | null; deal_id: string | null };
  path: string;
}) {
  const router = useRouter();
  const [type, setType] = React.useState<"note" | "call">("note");
  const [filter, setFilter] = React.useState<string>("all");
  const [body, setBody] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const res = await createJournalEntry({
      ...link,
      entry_type: type,
      body: body.trim(),
      call_outcome_id: type === "call" ? String(f.get("call_outcome_id")) || null : null,
      call_direction: type === "call" ? (String(f.get("call_direction")) as "inbound" | "outbound") : null,
      path,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setBody("");
    router.refresh();
  }

  const visible = filter === "all" ? entries : entries.filter((e) => e.entry_type === filter);

  return (
    <div>
      <form onSubmit={submit} className="mb-5 rounded-lg border border-line bg-surface p-4">
        <div className="mb-3 flex gap-1.5">
          {(["note", "call"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold capitalize",
                type === t ? "bg-ink text-white" : "bg-surface-3 text-fg-2 hover:text-fg-1",
              )}
            >
              {TYPE_ICON[t]} {t === "call" ? "Log call" : "Note"}
            </button>
          ))}
        </div>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={type === "call" ? "What was said, what happens next…" : "Write a note…"}
          rows={3}
        />
        {type === "call" ? (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Select name="call_direction" defaultValue="outbound" aria-label="Call direction">
              <option value="outbound">Outbound call</option>
              <option value="inbound">Inbound call</option>
            </Select>
            <Select name="call_outcome_id" defaultValue="" aria-label="Call outcome">
              <option value="">Outcome…</option>
              {outcomes.map((o) => (
                <option key={o.id} value={o.id}>{o.value}</option>
              ))}
            </Select>
          </div>
        ) : null}
        {error ? <p className="mt-2 text-sm font-medium text-danger">{error}</p> : null}
        <div className="mt-3 flex justify-end">
          <Button type="submit" size="sm" disabled={busy || !body.trim()}>
            {busy ? "Saving…" : "Save entry"}
          </Button>
        </div>
      </form>

      <div className="mb-3 flex items-center gap-1.5">
        {["all", "call", "note", "email", "system"].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilter(t)}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
              filter === t ? "bg-gold-tint text-gold-deep" : "text-fg-3 hover:bg-surface-3",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <EmptyState title="No journal entries yet" body="Calls, notes and emails logged against this record appear here." />
      ) : (
        <ol className="space-y-3">
          {visible.map((e) => (
            <li
              key={e.id}
              className={cn(
                "rounded-lg border border-line bg-surface px-4 py-3",
                e.entry_type === "system" && "bg-surface-2/60 py-2",
                e.pinned && "border-gold",
              )}
            >
              <div className="flex items-start gap-3">
                {e.entry_type !== "system" ? (
                  <Avatar name={e.author?.full_name ?? "System"} size={30} color={e.author?.calendar_color} />
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-sm font-bold text-fg-1">
                      {e.entry_type === "system" ? "System" : e.author?.full_name ?? "Unknown"}
                    </span>
                    <Badge tone={e.entry_type === "call" ? "gold" : "neutral"} className="gap-1">
                      {TYPE_ICON[e.entry_type]}
                      {e.entry_type}
                      {e.call_direction ? ` · ${e.call_direction}` : ""}
                    </Badge>
                    <span className="text-xs text-fg-4" title={formatDateTime(e.occurred_at)}>
                      {relativeTime(e.occurred_at)}
                    </span>
                    {e.pinned ? <Pin size={12} className="text-gold-deep" /> : null}
                  </div>
                  {e.subject ? <p className="mt-1 text-sm font-semibold text-fg-1">{e.subject}</p> : null}
                  {e.body ? (
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-fg-2">{e.body}</p>
                  ) : null}
                </div>
                {e.entry_type !== "system" ? (
                  <div className="flex shrink-0 gap-0.5">
                    <button
                      type="button"
                      title={e.pinned ? "Unpin" : "Pin to top"}
                      onClick={async () => {
                        await togglePin({ id: e.id, pinned: !e.pinned, path });
                        router.refresh();
                      }}
                      className="rounded p-1.5 text-fg-4 hover:bg-surface-3 hover:text-gold-deep"
                    >
                      <Pin size={14} />
                    </button>
                    <button
                      type="button"
                      title="Delete"
                      onClick={async () => {
                        if (!window.confirm("Delete this journal entry?")) return;
                        await deleteJournalEntry({ id: e.id, path });
                        router.refresh();
                      }}
                      className="rounded p-1.5 text-fg-4 hover:bg-surface-3 hover:text-danger"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
