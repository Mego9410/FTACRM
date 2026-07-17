"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LookupValue } from "@/lib/lookups";
import { Badge, Button, Card, EmptyState, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { cn, formatDateTime } from "@/lib/utils";
import { saveTask, setTaskStatus } from "./actions";

type Task = {
  id: string;
  title: string;
  details: string | null;
  due_at: string | null;
  status: string;
  assignee_id: string | null;
  category_id: string | null;
  linked: string | null;
  linkHref: string | null;
};

export function TasksClient({
  me,
  canSeeTeam,
  assignee,
  openNew,
  tasks,
  team,
  categories,
}: {
  me: string;
  canSeeTeam: boolean;
  assignee: string;
  openNew: boolean;
  tasks: Task[];
  team: { id: string; full_name: string }[];
  categories: LookupValue[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [creating, setCreating] = React.useState(openNew);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const now = new Date();
  const open = tasks.filter((t) => t.status === "open");
  const done = tasks.filter((t) => t.status === "done").slice(0, 20);
  const overdue = open.filter((t) => t.due_at && new Date(t.due_at) < now);
  const upcoming = open.filter((t) => !t.due_at || new Date(t.due_at) >= now);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const due = String(f.get("due_at") ?? "");
    const res = await saveTask({
      title: String(f.get("title")),
      details: String(f.get("details") ?? "") || null,
      due_at: due ? new Date(due).toISOString() : null,
      assignee_id: String(f.get("assignee_id") ?? "") || null,
      category_id: String(f.get("category_id") ?? "") || null,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setCreating(false);
    router.refresh();
  }

  function TaskRow({ t }: { t: Task }) {
    const isOverdue = t.status === "open" && t.due_at && new Date(t.due_at) < now;
    return (
      <li className="flex items-center gap-3 px-4 py-2.5">
        <input
          type="checkbox"
          checked={t.status === "done"}
          onChange={async (e) => {
            await setTaskStatus({ id: t.id, status: e.target.checked ? "done" : "open" });
            router.refresh();
          }}
          className="h-4 w-4 accent-[#E4AD25]"
          aria-label={`Complete ${t.title}`}
        />
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-semibold", t.status === "done" ? "text-fg-3 line-through" : "text-fg-1")}>
            {t.title}
          </p>
          <p className="text-xs text-fg-3">
            {[
              t.due_at ? formatDateTime(t.due_at) : null,
              t.category_id ? categories.find((c) => c.id === t.category_id)?.value : null,
              t.details,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {t.linked && t.linkHref ? (
          <Link href={t.linkHref} className="max-w-40 truncate text-xs font-semibold text-gold-deep hover:underline">
            {t.linked}
          </Link>
        ) : null}
        {isOverdue ? <Badge tone="danger">Overdue</Badge> : null}
      </li>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        {canSeeTeam ? (
          <Select
            value={assignee}
            onChange={(e) => router.push(`${pathname}?assignee=${e.target.value}`)}
            className="w-52"
            aria-label="Whose tasks"
          >
            {team.map((t) => (
              <option key={t.id} value={t.id}>
                {t.id === me ? `${t.full_name} (me)` : t.full_name}
              </option>
            ))}
          </Select>
        ) : (
          <div />
        )}
        <Button size="sm" onClick={() => setCreating(true)}>New task</Button>
      </div>

      {open.length === 0 && done.length === 0 ? (
        <EmptyState title="No tasks" body="A clean slate. Add a task to keep a follow-up from slipping." />
      ) : (
        <div className="space-y-5">
          {overdue.length > 0 ? (
            <Card className="border-danger/30">
              <p className="border-b border-line px-4 py-2.5 text-sm font-bold text-danger">Overdue ({overdue.length})</p>
              <ul className="divide-y divide-line">
                {overdue.map((t) => <TaskRow key={t.id} t={t} />)}
              </ul>
            </Card>
          ) : null}
          <Card>
            <p className="border-b border-line px-4 py-2.5 text-sm font-bold text-fg-1">Open ({upcoming.length})</p>
            {upcoming.length === 0 ? (
              <p className="px-4 py-5 text-sm text-fg-3">Nothing due — nicely on top of things.</p>
            ) : (
              <ul className="divide-y divide-line">
                {upcoming.map((t) => <TaskRow key={t.id} t={t} />)}
              </ul>
            )}
          </Card>
          {done.length > 0 ? (
            <Card>
              <p className="border-b border-line px-4 py-2.5 text-sm font-bold text-fg-3">Recently done</p>
              <ul className="divide-y divide-line">
                {done.map((t) => <TaskRow key={t.id} t={t} />)}
              </ul>
            </Card>
          ) : null}
        </div>
      )}

      <Dialog open={creating} onClose={() => setCreating(false)} title="New task">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Task" htmlFor="tk_title">
            <Input id="tk_title" name="title" required autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Due" htmlFor="tk_due">
              <Input id="tk_due" name="due_at" type="datetime-local" />
            </Field>
            <Field label="Category" htmlFor="tk_cat">
              <Select id="tk_cat" name="category_id" defaultValue="">
                <option value="">None</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.value}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Assign to" htmlFor="tk_assignee">
            <Select id="tk_assignee" name="assignee_id" defaultValue={me}>
              {team.map((t) => (
                <option key={t.id} value={t.id}>{t.id === me ? `${t.full_name} (me)` : t.full_name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Details" htmlFor="tk_details">
            <Textarea id="tk_details" name="details" rows={2} />
          </Field>
          {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create task"}</Button>
          </DialogFooter>
        </form>
      </Dialog>
    </div>
  );
}
