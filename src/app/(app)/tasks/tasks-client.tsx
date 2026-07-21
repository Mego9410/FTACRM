"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Check, ChevronRight, Columns3, ListChecks, type LucideIcon, Mail, Phone, PlayCircle, Rows3, X } from "lucide-react";
import type { LookupValue } from "@/lib/lookups";
import { Avatar, Badge, Button, Card, EmptyState, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { SortSelect, useClientSort } from "@/components/ui/sortable";
import { DialogFooter } from "@/components/ui/dialog";
import { SlideOver } from "@/components/ui/slide-over";
import { cn, formatDateTime } from "@/lib/utils";
import { saveTask, setTaskStage, setTaskStatus } from "./actions";
import { LINK_ICON, TaskLinksPicker, type TaskLink } from "./task-link-picker";
import type { TaskLinkView } from "./task-links";

export type TaskRow = {
  id: string;
  title: string;
  details: string | null;
  due_at: string | null;
  start_at: string | null;
  status: string;
  stage: string;
  queue: string | null;
  recurrence: string | null;
  task_type: string;
  priority: string | null;
  reminder_at: string | null;
  assignee_id: string | null;
  created_by: string | null;
  category_id: string | null;
  links: TaskLinkView[];
  assigneeName: string | null;
  assigneeColor: string | null;
  creatorName: string | null;
};

type TeamMember = { id: string; full_name: string; calendar_color: string | null };
type TaskType = "todo" | "call" | "email";

const TASK_TYPES: { v: TaskType; label: string; icon: LucideIcon }[] = [
  { v: "todo", label: "To-do", icon: ListChecks },
  { v: "call", label: "Call", icon: Phone },
  { v: "email", label: "Email", icon: Mail },
];
const TYPE_ICON: Record<string, LucideIcon> = { todo: ListChecks, call: Phone, email: Mail };
const PRIORITY_TONE: Record<string, "danger" | "gold" | "neutral"> = { high: "danger", medium: "gold", low: "neutral" };

export const STAGES: { v: string; label: string; color: string }[] = [
  { v: "not_started", label: "Not started", color: "#2F77BE" },
  { v: "in_progress", label: "In progress", color: "#0E7490" },
  { v: "waiting", label: "Waiting", color: "#B4862A" },
  { v: "completed", label: "Completed", color: "#1F9D4D" },
  { v: "deferred", label: "Deferred", color: "#8C8C88" },
];
const STAGE_LABEL: Record<string, string> = Object.fromEntries(STAGES.map((s) => [s.v, s.label]));
const STAGE_COLOR: Record<string, string> = Object.fromEntries(STAGES.map((s) => [s.v, s.color]));

const REMINDER_PRESETS: { v: string; label: string; ms: number | null }[] = [
  { v: "none", label: "No reminder", ms: null },
  { v: "at", label: "At time of task", ms: 0 },
  { v: "30m", label: "30 minutes before", ms: 30 * 60_000 },
  { v: "1h", label: "1 hour before", ms: 60 * 60_000 },
  { v: "1d", label: "1 day before", ms: 24 * 60 * 60_000 },
  { v: "1w", label: "1 week before", ms: 7 * 24 * 60 * 60_000 },
];

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TasksClient({
  me,
  view,
  openNew,
  openTaskId,
  tasks,
  team,
  categories,
}: {
  me: string;
  view: string;
  openNew: boolean;
  openTaskId?: string | null;
  tasks: TaskRow[];
  team: TeamMember[];
  categories: LookupValue[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [dialog, setDialog] = React.useState<{ mode: "new" | "edit"; task: TaskRow | null } | null>(
    openNew ? { mode: "new", task: null } : null,
  );
  const [links, setLinks] = React.useState<TaskLink[]>([]);
  const [type, setType] = React.useState<TaskType>("todo");
  const [priority, setPriority] = React.useState<string>("");
  const [stage, setStage] = React.useState<string>("not_started");
  const [startAt, setStartAt] = React.useState<string>("");
  const [queueName, setQueueName] = React.useState<string>("");
  const [recurrence, setRecurrence] = React.useState<string>("");
  const [reminderPreset, setReminderPreset] = React.useState<string>("none");
  const [hadReminder, setHadReminder] = React.useState<boolean>(false);
  const [followUp, setFollowUp] = React.useState<TaskRow | null>(null);
  const [queue, setQueue] = React.useState<TaskRow[] | null>(null);
  const [queueIdx, setQueueIdx] = React.useState(0);
  const [board, setBoard] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const { sorted, key, dir, set } = useClientSort(
    tasks,
    {
      due_at: (t) => t.due_at,
      title: (t) => t.title,
      assignee: (t) => t.assigneeName,
      category: (t) => (t.category_id ? categories.find((c) => c.id === t.category_id)?.value ?? "" : ""),
    },
    { key: "due_at", dir: "asc" },
  );

  const now = new Date();
  const open = sorted.filter((t) => t.status === "open");
  const done = sorted.filter((t) => t.status === "done").slice(0, 30);
  const overdue = open.filter((t) => t.due_at && new Date(t.due_at) < now);
  const upcoming = open.filter((t) => !t.due_at || new Date(t.due_at) >= now);

  function openNewDialog() {
    setLinks([]);
    setType("todo");
    setPriority("");
    setStage("not_started");
    setStartAt("");
    setQueueName("");
    setRecurrence("");
    setReminderPreset("none");
    setHadReminder(false);
    setError(null);
    setDialog({ mode: "new", task: null });
  }
  function openEditDialog(task: TaskRow) {
    setLinks(task.links.map((l) => ({ type: l.type, column: l.column, id: l.id, title: l.title })));
    setType((task.task_type as TaskType) || "todo");
    setPriority(task.priority ?? "");
    setStage(task.stage || "not_started");
    setStartAt(toLocalInputValue(task.start_at));
    setQueueName(task.queue ?? "");
    setRecurrence(task.recurrence ?? "");
    setReminderPreset(task.reminder_at ? "keep" : "none");
    setHadReminder(!!task.reminder_at);
    setError(null);
    setDialog({ mode: "edit", task });
  }

  function startQueue() {
    const q = [...overdue, ...upcoming];
    if (q.length === 0) return;
    setQueueIdx(0);
    setQueue(q);
  }
  function advanceQueue() {
    if (!queue) return;
    if (queueIdx + 1 >= queue.length) {
      setQueue(null);
      setQueueIdx(0);
      router.refresh();
    } else {
      setQueueIdx(queueIdx + 1);
    }
  }
  async function queueComplete(t: TaskRow) {
    await setTaskStatus({ id: t.id, status: "done" });
    advanceQueue();
    router.refresh();
  }

  // Deep link: /tasks?task=<id> opens that task's editor.
  React.useEffect(() => {
    if (!openTaskId) return;
    const t = tasks.find((x) => x.id === openTaskId);
    if (t) openEditDialog(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openTaskId]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const due = String(f.get("due_at") ?? "");
    const dueIso = due ? new Date(due).toISOString() : null;
    const preset = REMINDER_PRESETS.find((p) => p.v === reminderPreset);
    const reminderIso =
      reminderPreset === "keep"
        ? undefined // leave the existing reminder untouched
        : preset && preset.ms !== null && dueIso
          ? new Date(new Date(dueIso).getTime() - preset.ms).toISOString()
          : null;
    const res = await saveTask({
      id: dialog?.task?.id,
      title: String(f.get("title")),
      details: String(f.get("details") ?? "") || null,
      due_at: dueIso,
      start_at: startAt ? new Date(startAt).toISOString() : null,
      assignee_id: String(f.get("assignee_id") ?? "") || null,
      category_id: String(f.get("category_id") ?? "") || null,
      task_type: type,
      priority: priority || null,
      stage,
      queue: queueName.trim() || null,
      recurrence: recurrence || null,
      ...(reminderIso !== undefined ? { reminder_at: reminderIso } : {}),
      links: links.map((l) => ({ column: l.column, id: l.id })),
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setDialog(null);
    router.refresh();
  }

  async function createFollowUp(days: number) {
    if (!followUp) return;
    setBusy(true);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + days);
    dueDate.setHours(9, 0, 0, 0);
    await saveTask({
      title: `Follow up: ${followUp.title}`,
      details: null,
      due_at: dueDate.toISOString(),
      assignee_id: followUp.assignee_id ?? me,
      category_id: followUp.category_id ?? null,
      task_type: followUp.task_type,
      priority: followUp.priority,
      links: followUp.links.map((l) => ({ column: l.column, id: l.id })),
    });
    setBusy(false);
    setFollowUp(null);
    router.refresh();
  }

  const viewLabel = (v: string) =>
    v === "mine" ? "My tasks" : v === "by-me" ? "Assigned by me" : v === "all" ? "Everyone's tasks" : team.find((t) => t.id === v)?.full_name ?? "Tasks";

  function TaskRowItem({ t }: { t: TaskRow }) {
    const isOverdue = t.status === "open" && t.due_at && new Date(t.due_at) < now;
    const showAssignee = t.assignee_id !== me && t.assigneeName;
    const fromSomeoneElse = t.assignee_id === me && t.created_by && t.created_by !== me && t.creatorName;
    const TypeIcon = TYPE_ICON[t.task_type] ?? ListChecks;
    return (
      <li
        className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-2/60"
        onClick={() => openEditDialog(t)}
      >
        <input
          type="checkbox"
          checked={t.status === "done"}
          onClick={(e) => e.stopPropagation()}
          onChange={async (e) => {
            const markDone = e.target.checked;
            await setTaskStatus({ id: t.id, status: markDone ? "done" : "open" });
            router.refresh();
            if (markDone) setFollowUp(t);
          }}
          className="h-4 w-4 shrink-0 accent-[#E4AD25]"
          aria-label={`Complete ${t.title}`}
        />
        <span className="shrink-0 text-fg-3" title={t.task_type}>
          <TypeIcon size={15} />
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
            {t.links.map((l) => (
              <Link
                key={`${l.column}-${l.id}`}
                href={l.href}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 rounded-sm bg-gold-tint px-1.5 py-0.5 font-semibold text-gold-deep hover:underline"
              >
                {LINK_ICON[l.type]}
                <span className="max-w-40 truncate">{l.title}</span>
              </Link>
            ))}
            {fromSomeoneElse ? <span className="text-fg-4">from {t.creatorName}</span> : null}
          </div>
        </div>
        <span
          className="hidden shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold sm:inline-flex"
          style={{ backgroundColor: `${STAGE_COLOR[t.stage]}1c`, color: STAGE_COLOR[t.stage] }}
        >
          {STAGE_LABEL[t.stage] ?? t.stage}
        </span>
        {showAssignee ? (
          <span className="hidden items-center gap-1.5 sm:flex" title={`Assigned to ${t.assigneeName}`}>
            <Avatar name={t.assigneeName!} size={22} color={t.assigneeColor ?? undefined} />
            <span className="max-w-28 truncate text-xs font-semibold text-fg-2">{t.assigneeName}</span>
          </span>
        ) : null}
        {t.priority ? (
          <Badge tone={PRIORITY_TONE[t.priority] ?? "neutral"} className="capitalize">
            {t.priority}
          </Badge>
        ) : null}
        {isOverdue ? <Badge tone="danger">Overdue</Badge> : null}
        <ChevronRight size={16} className="shrink-0 text-fg-4" />
      </li>
    );
  }

  const dialogTask = dialog?.task ?? null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Select
          value={view}
          onChange={(e) => router.push(`${pathname}?view=${e.target.value}`)}
          className="w-56"
          aria-label="Whose tasks"
        >
          <option value="mine">My tasks</option>
          <option value="by-me">Assigned by me</option>
          <option value="all">Everyone&apos;s tasks</option>
          <optgroup label="A person's tasks">
            {team.map((t) => (
              <option key={t.id} value={t.id}>
                {t.id === me ? `${t.full_name} (me)` : t.full_name}
              </option>
            ))}
          </optgroup>
        </Select>
        <div className="flex items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-md border border-line">
            <button
              type="button"
              onClick={() => setBoard(false)}
              className={cn("inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-semibold", !board ? "bg-gold-tint text-gold-deep" : "bg-surface text-fg-2 hover:bg-surface-2")}
              title="List view"
            >
              <Rows3 size={15} /> List
            </button>
            <button
              type="button"
              onClick={() => setBoard(true)}
              className={cn("inline-flex items-center gap-1.5 border-l border-line px-2.5 py-1.5 text-[13px] font-semibold", board ? "bg-gold-tint text-gold-deep" : "bg-surface text-fg-2 hover:bg-surface-2")}
              title="Board view"
            >
              <Columns3 size={15} /> Board
            </button>
          </div>
          {!board ? (
            <SortSelect
              options={[
                { key: "due_at", label: "Due date" },
                { key: "title", label: "Title" },
                { key: "assignee", label: "Assignee" },
                { key: "category", label: "Category" },
              ]}
              sortKey={key}
              dir={dir}
              onChange={set}
            />
          ) : null}
          {overdue.length + upcoming.length > 0 ? (
            <Button variant="outline" size="sm" onClick={startQueue}>
              <PlayCircle size={15} /> Start queue ({overdue.length + upcoming.length})
            </Button>
          ) : null}
          <Button size="sm" onClick={openNewDialog}>New task</Button>
        </div>
      </div>

      {board ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {STAGES.map((s) => {
            const items = sorted.filter((t) => t.stage === s.v);
            return (
              <div key={s.v} className="flex w-72 shrink-0 flex-col rounded-lg border border-line bg-surface-2/60">
                <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold"
                    style={{ backgroundColor: `${s.color}1c`, color: s.color }}
                  >
                    {s.label}
                  </span>
                  <span className="text-xs font-semibold text-fg-3">{items.length}</span>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto p-2">
                  {items.map((t) => {
                    const TypeIcon = TYPE_ICON[t.task_type] ?? ListChecks;
                    return (
                      <div key={t.id} className="rounded-md border border-line bg-surface p-2.5 shadow-xs">
                        <button type="button" onClick={() => openEditDialog(t)} className="block w-full text-left">
                          <p className={cn("truncate text-sm font-semibold", t.status === "done" ? "text-fg-3 line-through" : "text-fg-1")}>
                            {t.title}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-3">
                            <span className="inline-flex items-center gap-1"><TypeIcon size={13} /> {t.task_type}</span>
                            {t.due_at ? <span className={cn(t.status === "open" && new Date(t.due_at) < now && "font-semibold text-danger")}>{formatDateTime(t.due_at)}</span> : null}
                            {t.priority ? <Badge tone={PRIORITY_TONE[t.priority] ?? "neutral"} className="capitalize">{t.priority}</Badge> : null}
                          </div>
                          {t.assigneeName ? (
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <Avatar name={t.assigneeName} size={18} color={t.assigneeColor ?? undefined} />
                              <span className="truncate text-xs text-fg-3">{t.assigneeName}</span>
                            </div>
                          ) : null}
                        </button>
                        <Select
                          value={t.stage}
                          onChange={async (e) => {
                            await setTaskStage({ id: t.id, stage: e.target.value });
                            router.refresh();
                          }}
                          className="mt-2 h-8 text-xs"
                          aria-label="Move stage"
                        >
                          {STAGES.map((opt) => (
                            <option key={opt.v} value={opt.v}>Move to: {opt.label}</option>
                          ))}
                        </Select>
                      </div>
                    );
                  })}
                  {items.length === 0 ? <p className="px-1 py-3 text-center text-xs text-fg-4">Nothing here</p> : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {board ? null : open.length === 0 && done.length === 0 ? (
        <EmptyState
          title={`No tasks in “${viewLabel(view)}”`}
          body="Add a task to keep a follow-up from slipping — you can assign it to anyone and tag it to a practice, buyer, seller or deal."
        />
      ) : (
        <div className="space-y-5">
          {overdue.length > 0 ? (
            <Card className="border-danger/30">
              <p className="border-b border-line px-4 py-2.5 text-sm font-bold text-danger">Overdue ({overdue.length})</p>
              <ul className="divide-y divide-line">
                {overdue.map((t) => (
                  <TaskRowItem key={t.id} t={t} />
                ))}
              </ul>
            </Card>
          ) : null}
          <Card>
            <p className="border-b border-line px-4 py-2.5 text-sm font-bold text-fg-1">Open ({upcoming.length})</p>
            {upcoming.length === 0 ? (
              <p className="px-4 py-5 text-sm text-fg-3">Nothing due — nicely on top of things.</p>
            ) : (
              <ul className="divide-y divide-line">
                {upcoming.map((t) => (
                  <TaskRowItem key={t.id} t={t} />
                ))}
              </ul>
            )}
          </Card>
          {done.length > 0 ? (
            <Card>
              <p className="border-b border-line px-4 py-2.5 text-sm font-bold text-fg-3">Recently done</p>
              <ul className="divide-y divide-line">
                {done.map((t) => (
                  <TaskRowItem key={t.id} t={t} />
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      )}

      <SlideOver open={!!dialog} onClose={() => setDialog(null)} title={dialog?.mode === "edit" ? "Edit task" : "New task"}>
        <form key={dialogTask?.id ?? "new"} onSubmit={submit} className="space-y-4">
          <div className="flex gap-1.5">
            {TASK_TYPES.map((tt) => {
              const Icon = tt.icon;
              return (
                <button
                  key={tt.v}
                  type="button"
                  onClick={() => setType(tt.v)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-[13px] font-semibold transition-colors",
                    type === tt.v ? "border-gold bg-gold-tint text-gold-deep" : "border-line text-fg-2 hover:bg-surface-2",
                  )}
                >
                  <Icon size={15} />
                  {tt.label}
                </button>
              );
            })}
          </div>
          <Field label="Task" htmlFor="tk_title">
            <Input id="tk_title" name="title" defaultValue={dialogTask?.title ?? ""} required autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Due date" htmlFor="tk_due">
              <Input id="tk_due" name="due_at" type="datetime-local" defaultValue={toLocalInputValue(dialogTask?.due_at ?? null)} />
            </Field>
            <Field label="Start date" htmlFor="tk_start">
              <Input id="tk_start" type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Task stage" htmlFor="tk_stage">
              <Select id="tk_stage" value={stage} onChange={(e) => setStage(e.target.value)}>
                {STAGES.map((s) => (
                  <option key={s.v} value={s.v}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Priority" htmlFor="tk_priority">
              <Select id="tk_priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="">None</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
            </Field>
          </div>
          <Field label="Associate task with" htmlFor="tk_link">
            <TaskLinksPicker value={links} onChange={setLinks} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Assigned to" htmlFor="tk_assignee_grid">
              <Select id="tk_assignee_grid" name="assignee_id" defaultValue={dialogTask?.assignee_id ?? me}>
                {team.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.id === me ? `${t.full_name} (me)` : t.full_name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Category" htmlFor="tk_cat">
              <Select id="tk_cat" name="category_id" defaultValue={dialogTask?.category_id ?? ""}>
                <option value="">None</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.value}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Queue" htmlFor="tk_queue">
              <Input id="tk_queue" value={queueName} onChange={(e) => setQueueName(e.target.value)} placeholder="e.g. Morning calls" />
            </Field>
            <Field label="Set to repeat" htmlFor="tk_recurrence">
              <Select id="tk_recurrence" value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
                <option value="">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </Select>
            </Field>
          </div>
          <Field label="Reminder" htmlFor="tk_reminder" hint="Relative to the due date.">
            <Select id="tk_reminder" value={reminderPreset} onChange={(e) => setReminderPreset(e.target.value)}>
              {hadReminder ? <option value="keep">Keep current reminder</option> : null}
              {REMINDER_PRESETS.map((p) => (
                <option key={p.v} value={p.v}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Task notes" htmlFor="tk_details">
            <Textarea id="tk_details" name="details" rows={3} defaultValue={dialogTask?.details ?? ""} />
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

      <SlideOver open={!!followUp} onClose={() => setFollowUp(null)} title="Task completed">
        <p className="text-sm text-fg-2">Nice work. Want to line up a follow-up?</p>
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

      {queue ? (
        <QueueMode
          tasks={queue}
          index={queueIdx}
          busy={busy}
          categories={categories}
          onComplete={queueComplete}
          onSkip={advanceQueue}
          onEdit={(t) => {
            setQueue(null);
            openEditDialog(t);
          }}
          onExit={() => {
            setQueue(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

/* ── Queue: work through tasks one at a time (HubSpot "Start queue") ─── */

function QueueMode({
  tasks,
  index,
  busy,
  categories,
  onComplete,
  onSkip,
  onEdit,
  onExit,
}: {
  tasks: TaskRow[];
  index: number;
  busy: boolean;
  categories: LookupValue[];
  onComplete: (t: TaskRow) => void;
  onSkip: () => void;
  onEdit: (t: TaskRow) => void;
  onExit: () => void;
}) {
  const t = tasks[index];
  if (!t) return null;
  const TypeIcon = TYPE_ICON[t.task_type] ?? ListChecks;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface-2">
      <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-3">
        <p className="text-sm font-bold text-fg-1">Task queue</p>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-fg-3">
            {index + 1} of {tasks.length}
          </span>
          <button
            type="button"
            onClick={onExit}
            className="rounded-md p-1.5 text-fg-3 hover:bg-surface-2 hover:text-fg-1"
            aria-label="Exit queue"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="h-1 bg-line">
        <div className="h-full bg-gold transition-all" style={{ width: `${(index / tasks.length) * 100}%` }} />
      </div>
      <div className="flex flex-1 items-center justify-center overflow-y-auto p-4">
        <div className="w-full max-w-xl rounded-xl border border-line bg-surface p-6 shadow-sm">
          <div className="flex items-center gap-2 text-fg-3">
            <TypeIcon size={16} />
            <span className="text-xs font-bold uppercase tracking-wide capitalize">{t.task_type}</span>
            {t.priority ? (
              <Badge tone={PRIORITY_TONE[t.priority] ?? "neutral"} className="capitalize">
                {t.priority}
              </Badge>
            ) : null}
          </div>
          <h2 className="mt-2 text-xl font-extrabold text-fg-1">{t.title}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-3">
            {t.due_at ? <span>Due {formatDateTime(t.due_at)}</span> : null}
            {t.category_id ? <span>{categories.find((c) => c.id === t.category_id)?.value}</span> : null}
          </div>
          {t.links.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {t.links.map((l) => (
                <Link
                  key={`${l.column}-${l.id}`}
                  href={l.href}
                  className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-2 px-3 py-2 text-sm font-semibold text-gold-deep hover:bg-gold-tint"
                >
                  {LINK_ICON[l.type]} {l.title}
                </Link>
              ))}
            </div>
          ) : null}
          {t.details ? <p className="mt-4 whitespace-pre-wrap text-sm text-fg-2">{t.details}</p> : null}
          <div className="mt-6 flex items-center gap-2">
            <Button disabled={busy} onClick={() => onComplete(t)}>
              <Check size={15} /> Complete
            </Button>
            <Button variant="outline" onClick={onSkip}>
              Skip <ChevronRight size={15} />
            </Button>
            <Button variant="ghost" onClick={() => onEdit(t)}>
              Edit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
