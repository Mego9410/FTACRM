"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Ban, Mail, RotateCcw } from "lucide-react";
import type { BuyerMatchRow } from "@/lib/matching/queries";
import { Avatar, Badge, Button, Card, EmptyState, Field, Input } from "@/components/ui/primitives";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { cn, relativeTime } from "@/lib/utils";
import { bulkAddTasks, excludeMatch, unexcludeMatch } from "@/lib/actions/matching";

export function MatchedBuyersClient({ practiceId, rows }: { practiceId: string; rows: BuyerMatchRow[] }) {
  const router = useRouter();
  const path = usePathname();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [taskOpen, setTaskOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const actionable = rows.filter((r) => !r.excluded && !r.do_not_contact);
  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const emailable = [...selected].filter((id) => {
    const row = rows.find((r) => r.contact_id === id);
    return row && !row.do_not_contact && row.email && row.consent_email !== false;
  });

  async function submitTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const due = String(f.get("due_at") ?? "");
    await bulkAddTasks({
      contact_ids: [...selected],
      practice_id: practiceId,
      title: String(f.get("title")),
      due_at: due ? new Date(due).toISOString() : null,
    });
    setBusy(false);
    setTaskOpen(false);
    setSelected(new Set());
    router.refresh();
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No matching buyers"
        body="No active buyer's criteria fit this practice yet. Check the practice's price, funding, location and postcode are set — and that buyers have criteria recorded."
      />
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-fg-3">
          <strong className="text-fg-1">{actionable.length}</strong> matching buyers
          {rows.length !== actionable.length ? ` (${rows.length - actionable.length} excluded or DNC)` : ""}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setSelected(selected.size === actionable.length ? new Set() : new Set(actionable.map((r) => r.contact_id)))
            }
          >
            {selected.size === actionable.length ? "Clear selection" : "Select all"}
          </Button>
          {selected.size > 0 ? (
            <>
              <Badge tone="gold">{selected.size} selected</Badge>
              <Link
                href={`/campaigns/new?contacts=${emailable.join(",")}&practice=${practiceId}`}
                aria-disabled={emailable.length === 0}
              >
                <Button size="sm" disabled={emailable.length === 0}>
                  <Mail size={14} /> Email selected ({emailable.length})
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => setTaskOpen(true)}>
                Add tasks
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((r) => (
          <Card
            key={r.contact_id}
            className={cn(
              "flex items-center gap-3 px-4 py-3",
              (r.excluded || r.do_not_contact) && "opacity-55",
            )}
          >
            <input
              type="checkbox"
              checked={selected.has(r.contact_id)}
              disabled={r.excluded || r.do_not_contact}
              onChange={() => toggle(r.contact_id)}
              className="h-4 w-4 accent-[#E4AD25]"
              aria-label={`Select ${r.name}`}
            />
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold",
                r.score >= 80 ? "bg-available/15 text-available-fg" : r.score >= 65 ? "bg-gold-tint text-gold-deep" : "bg-surface-3 text-fg-2",
              )}
              title="Match score"
            >
              {r.score}
            </span>
            <Avatar name={r.name} size={30} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <Link href={`/contacts/${r.contact_id}`} className="text-sm font-bold text-fg-1 hover:underline">
                  {r.name}
                </Link>
                {r.temperature ? (
                  <Badge tone={r.temperature === "hot" ? "danger" : r.temperature === "warm" ? "gold" : "nhs"} className="capitalize">
                    {r.temperature}
                  </Badge>
                ) : null}
                {r.do_not_contact ? <Badge tone="danger">Do not contact</Badge> : null}
                {r.excluded ? <Badge>Marked not suitable</Badge> : null}
              </div>
              <p className="mt-0.5 flex flex-wrap gap-1 text-xs text-fg-3">
                {r.facets.map((facet) => (
                  <span key={facet} className="rounded-full bg-surface-2 px-2 py-0.5">{facet}</span>
                ))}
                <span className="px-1 py-0.5">
                  Last contacted {r.last_contacted_at ? relativeTime(r.last_contacted_at) : "never"}
                </span>
              </p>
            </div>
            {r.excluded ? (
              <Button
                variant="ghost"
                size="sm"
                title="Restore to matches"
                onClick={async () => {
                  await unexcludeMatch({ practice_id: practiceId, contact_id: r.contact_id, path });
                  router.refresh();
                }}
              >
                <RotateCcw size={13} /> Restore
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                title="Not suitable for this practice"
                onClick={async () => {
                  await excludeMatch({ practice_id: practiceId, contact_id: r.contact_id, path });
                  router.refresh();
                }}
              >
                <Ban size={13} /> Not suitable
              </Button>
            )}
          </Card>
        ))}
      </div>

      <Dialog open={taskOpen} onClose={() => setTaskOpen(false)} title={`Add a task for ${selected.size} buyers`}>
        <form onSubmit={submitTask} className="space-y-4">
          <Field label="Task" htmlFor="bt_title">
            <Input id="bt_title" name="title" required placeholder="Call about the new instruction" />
          </Field>
          <Field label="Due" htmlFor="bt_due">
            <Input id="bt_due" name="due_at" type="datetime-local" />
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setTaskOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Creating…" : `Create ${selected.size} tasks`}</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
