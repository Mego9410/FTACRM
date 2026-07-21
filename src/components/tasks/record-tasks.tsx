"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, ListChecks, type LucideIcon, Mail, Phone } from "lucide-react";
import type { LookupValue } from "@/lib/lookups";
import { Avatar, Badge, Button, EmptyState, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { DialogFooter } from "@/components/ui/dialog";
import { SlideOver } from "@/components/ui/slide-over";
import { cn, formatDateTime } from "@/lib/utils";
import { saveTask, setTaskStatus } from "@/app/(app)/tasks/actions";

export type RecordTaskRow = {
  id: string;
  title: string;
  details: string | null;
  due_at: string | null;
  status: string;
  task_type: string;
  priority: string | null;
  reminder_at: string | null;
  assignee_id: string | null;
  category_id: string | null;
  assigneeName: string | null;
  assigneeColor: string | null;
};

type TeamMember = { id: string; full_name: string; calendar_color: string | null };
type TaskType = "todo" | "call" | "email";

const TYPES: { v: TaskType; label: string; icon: LucideIcon }[] = [
  { v: "todo", label: "To-do", icon: ListChecks },
  { v: "call", label: "Call", icon: Phone },
  { v: "email", label: "Email", icon: Mail },
];
const TYPE_ICON: Record<string, LucideIcon> = { todo: ListChecks, call: Phone, email: Mail };
const PRIORITY_TONE: Record<string, "danger" | "gold" | "neutral"> = { high: "danger", medium: "gold", low: "neutral" };

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RecordTasks({
  recordType,
  recordId,
  path,
  me,
  team,
  categories,
  tasks,
}: {
  recordType: "contact" | "practice" | "deal";
  recordId: string;
  path: string;
  me: string;
  team: TeamMember[];
  categories: LookupValue[];
  tasks: RecordTaskRow[];
}) {
  const router = useRouter();
  const column = recordType === "contact" ? "contact_id" : recordType === "practice" ? "practice_id" : "deal_id";

  const [dialog, setDialog] = React.useState<{ mode: "new" | "edit"; task: RecordTaskRow | null } | null>(null);
  const [followUp, setFollowUp] = React.useState<RecordTaskRow | null>(null);
  const [type, setType] = React.useState<TaskType>("todo");
  const [priority, setPriority] = React.useState<string>("");
  const [reminderAt, setReminderAt] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [showDone, setShowDone] = React.useState(false);

  const now = new Date();
  const open = tasks.filter((t) => t.status === "open");
  const done = tasks.filter((t) => t.status === "done");
  const overdue = open.filter((t) => t.due_at && new Date(t.due_at) < now);
  const upcoming = open.filter((t) => !t.due_at || new Date(t.due_at) >= now);

  function openNew() {
    setType("todo");
    setPriority("");
    setReminderAt("");
    setError(null);
    setDialog({ mode: "new", task: null });
  }
  function openEdit(t: RecordTaskRow) {
    setType((t.task_type as TaskType) || "todo");
    setPriority(t.priority ?? "");
    setReminderAt(toLocalInputValue(t.reminder_at));
    setError(null);
    setDialog({ mode: "edit", task: t });
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const due = String(f.get("due_at") ?? "");
    const res = await saveTask({
      id: dialog?.task?.id,
      title: String(f.get("title")),
      details: String(f.get("details") ?? "") || null,
      due_at: due ? new Date(due).toISOString() : null,
      assignee_id: String(f.get("assignee_id") ?? "") || null,
      category_id: String(f.get("category_id") ?? "") || null,
      task_type: type,
      priority: priority || null,
      reminder_at: reminderAt ? new Date(reminderAt).toISOString() : null,
      [column]: recordId,
      path,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setDialog(null);
    router.refresh();
  }

  async function complete(t: RecordTaskRow, markDone: boolean) {
    await setTaskStatus({ id: t.id, status: markDone ? "done" : "open", path });
    router.refresh();
    if (markDone) setFollowUp(t);
  }

  async function createFollowUp(days: number) {
    if (!followUp) return;
    setBusy(true);
    const due = new Date();
    due.setDate(due.getDate() + days);
    due.setHours(9, 0, 0, 0);
    await saveTask({
      title: `Follow up: ${followUp.title}`,
      details: null,
      due_at: due.toISOString(),
      assignee_id: followUp.assignee_id ?? me,
      category_id: followUp.category_id ?? null,
      task_type: followUp.task_type,
      priority: followUp.priority,
      [column]: recordId,
      path,
    });
    setBusy(false);
    setFollowUp(null);
    router.refresh();
  }

  const dialogTask = dialog?.task ?? null;

  function TaskItem({ t }: { t: RecordTaskRow }) {
    const Icon = TYPE_ICON[t.task_type] ?? ListChecks;
    const isOverdue = t.status === "open" && t.due_at && new Date(t.due_at) < now;
    const assignee = team.find((m) => m.id === t.assignee_id);
    return (
      <li className="flex items-center gap-3 px-4 py-2.5">
        <button
          type="button"
          onClick={() => complete(t, t.status !== "done")}
          className="shrink-0"
          aria-label={t.status === "done" ? "Mark open" : "Mark done"}
          title={t.status === "done" ? "Mark open" : "Mark done"}
        >
          {t.status === "done" ? (
            <CheckCircle2 size={18} className="text-available-fg" />
          ) : (
            <Circle size={18} className="text-fg-4 hover:text-available-fg" />
          )}
        </button>
        <span className="shrink-0 text-fg-3" title={t.task_type}>
          <Icon size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-sm font-semibold", t.status === "done" ? "text-fg-3 line-through" : "text-fg-1")}>
            {t.title}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-3">
            {t.due_at ? <span className={cn(isOverdue && "font-semibold text-danger")}>{formatDateTime(t.due_at)}</span> : null}
            {t.category_id ? (
              <Badge tone="neutral" className="capitalize">
                {categories.find((c) => c.id === t.category_id)?.value}
              </Badge>
            ) : null}
            {t.details ? <span className="truncate">{t.details}</span> : null}
          </div>
        </div>
        {t.priority ? (
          <Badge tone={PRIORITY_TONE[t.priority] ?? "neutral"} className="capitalize">
            {t.priority}
          </Badge>
        ) : null}
        {isOverdue ? <Badge tone="danger">Overdue</Badge> : null}
        {assignee && assignee.id !== me ? (
          <Avatar name={assignee.full_name} size={22} color={assignee.calendar_color ?? undefined} />
        ) : null}
        <button
          type="button"
          onClick={() => openEdit(t)}
          className="shrink-0 rounded p-1 text-fg-4 hover:bg-surface-2 hover:text-fg-1"
          aria-label={`Edit ${t.title}`}
        >
          <span className="text-[11px] font-semibold">Edit</span>
        </button>
      </li>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-fg-1">Tasks</h2>
        <Button size="sm" onClick={openNew}>
          New task
        </Button>
      </div>

      {open.length === 0 && done.length === 0 ? (
        <EmptyState
          icon={<ListChecks size={20} />}
          title="No tasks yet"
          body="Add a to-do, call or email follow-up against this record."
          action={
            <Button size="sm" onClick={openNew}>
              New task
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          {overdue.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-danger/30 bg-surface">
              <p className="border-b border-line px-4 py-2.5 text-sm font-bold text-danger">Overdue ({overdue.length})</p>
              <ul className="divide-y divide-line">
                {overdue.map((t) => (
                  <TaskItem key={t.id} t={t} />
                ))}
              </ul>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <p className="border-b border-line px-4 py-2.5 text-sm font-bold text-fg-1">Open ({upcoming.length})</p>
            {upcoming.length === 0 ? (
              <p className="px-4 py-5 text-sm text-fg-3">Nothing outstanding.</p>
            ) : (
              <ul className="divide-y divide-line">
                {upcoming.map((t) => (
                  <TaskItem key={t.id} t={t} />
                ))}
              </ul>
            )}
          </div>

          {done.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-line bg-surface">
              <button
                type="button"
                onClick={() => setShowDone((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-bold text-fg-3 hover:bg-surface-2"
              >
                Completed ({done.length})
                <span className="text-xs font-semibold text-gold-deep">{showDone ? "Hide" : "Show"}</span>
              </button>
              {showDone ? (
                <ul className="divide-y divide-line border-t border-line">
                  {done.map((t) => (
                    <TaskItem key={t.id} t={t} />
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      {/* Add / edit panel */}
      <SlideOver open={!!dialog} onClose={() => setDialog(null)} title={dialog?.mode === "edit" ? "Edit task" : "New task"}>
        <form key={dialogTask?.id ?? "new"} onSubmit={submit} className="space-y-4">
          <div className="flex gap-1.5">
            {TYPES.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.v}
                  type="button"
                  onClick={() => setType(t.v)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-[13px] font-semibold transition-colors",
                    type === t.v ? "border-gold bg-gold-tint text-gold-deep" : "border-line text-fg-2 hover:bg-surface-2",
                  )}
                >
                  <Icon size={15} />
                  {t.label}
                </button>
              );
            })}
          </div>
          <Field label="Task" htmlFor="rt_title">
            <Input id="rt_title" name="title" defaultValue={dialogTask?.title ?? ""} required autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Due" htmlFor="rt_due">
              <Input id="rt_due" name="due_at" type="datetime-local" defaultValue={toLocalInputValue(dialogTask?.due_at ?? null)} />
            </Field>
            <Field label="Priority" htmlFor="rt_priority">
              <Select id="rt_priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="">None</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Assign to" htmlFor="rt_assignee">
              <Select id="rt_assignee" name="assignee_id" defaultValue={dialogTask?.assignee_id ?? me}>
                {team.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id === me ? `${m.full_name} (me)` : m.full_name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Category" htmlFor="rt_cat">
              <Select id="rt_cat" name="category_id" defaultValue={dialogTask?.category_id ?? ""}>
                <option value="">None</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.value}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Reminder" htmlFor="rt_reminder" hint="Notify the assignee at this time.">
            <Input id="rt_reminder" type="datetime-local" value={reminderAt} onChange={(e) => setReminderAt(e.target.value)} />
          </Field>
          <Field label="Details" htmlFor="rt_details">
            <Textarea id="rt_details" name="details" rows={2} defaultValue={dialogTask?.details ?? ""} />
          </Field>
          {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDialog(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : dialog?.mode === "edit" ? "Save changes" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </SlideOver>

      {/* Follow-up prompt on completion */}
      <SlideOver open={!!followUp} onClose={() => setFollowUp(null)} title="Task completed">
        <p className="text-sm text-fg-2">Nice work. Want to line up a follow-up on this record?</p>
        <div className="mt-4 grid grid-cols-1 gap-2">
          <Button variant="outline" disabled={busy} onClick={() => void createFollowUp(1)}>
            Follow up tomorrow
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => void createFollowUp(3)}>
            Follow up in 3 days
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => void createFollowUp(7)}>
            Follow up in a week
          </Button>
          <Button variant="ghost" onClick={() => setFollowUp(null)}>
            No follow-up
          </Button>
        </div>
      </SlideOver>
    </div>
  );
}
