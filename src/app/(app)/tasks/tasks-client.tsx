"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ListChecks, type LucideIcon, Mail, Pencil, Phone } from "lucide-react";
import type { LookupValue } from "@/lib/lookups";
import { Avatar, Badge, Button, Card, EmptyState, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { SortSelect, useClientSort } from "@/components/ui/sortable";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { cn, formatDateTime } from "@/lib/utils";
import { saveTask, setTaskStatus } from "./actions";
import type { LinkColumn, LinkType } from "./link-search";
import { LINK_ICON, TaskLinkPicker, type TaskLink } from "./task-link-picker";

export type TaskRow = {
  id: string;
  title: string;
  details: string | null;
  due_at: string | null;
  status: string;
  task_type: string;
  priority: string | null;
  assignee_id: string | null;
  created_by: string | null;
  category_id: string | null;
  link: { type: LinkType; column: LinkColumn; id: string; title: string; href: string } | null;
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
  const [link, setLink] = React.useState<TaskLink | null>(null);
  const [type, setType] = React.useState<TaskType>("todo");
  const [priority, setPriority] = React.useState<string>("");
  const [followUp, setFollowUp] = React.useState<TaskRow | null>(null);
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
    setLink(null);
    setType("todo");
    setPriority("");
    setError(null);
    setDialog({ mode: "new", task: null });
  }
  function openEditDialog(task: TaskRow) {
    setLink(task.link ? { type: task.link.type, column: task.link.column, id: task.link.id, title: task.link.title } : null);
    setType((task.task_type as TaskType) || "todo");
    setPriority(task.priority ?? "");
    setError(null);
    setDialog({ mode: "edit", task });
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
    const links = { contact_id: null as string | null, practice_id: null as string | null, deal_id: null as string | null };
    if (link) links[link.column] = link.id;
    const res = await saveTask({
      id: dialog?.task?.id,
      title: String(f.get("title")),
      details: String(f.get("details") ?? "") || null,
      due_at: due ? new Date(due).toISOString() : null,
      assignee_id: String(f.get("assignee_id") ?? "") || null,
      category_id: String(f.get("category_id") ?? "") || null,
      task_type: type,
      priority: priority || null,
      ...links,
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
    const links = { contact_id: null as string | null, practice_id: null as string | null, deal_id: null as string | null };
    if (followUp.link) links[followUp.link.column] = followUp.link.id;
    await saveTask({
      title: `Follow up: ${followUp.title}`,
      details: null,
      due_at: dueDate.toISOString(),
      assignee_id: followUp.assignee_id ?? me,
      category_id: followUp.category_id ?? null,
      task_type: followUp.task_type,
      priority: followUp.priority,
      ...links,
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
      <li className="flex items-center gap-3 px-4 py-2.5">
        <input
          type="checkbox"
          checked={t.status === "done"}
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
            {t.link ? (
              <Link
                href={t.link.href}
                className="inline-flex items-center gap-1 rounded-sm bg-gold-tint px-1.5 py-0.5 font-semibold text-gold-deep hover:underline"
              >
                {LINK_ICON[t.link.type]}
                <span className="max-w-40 truncate">{t.link.title}</span>
              </Link>
            ) : null}
            {fromSomeoneElse ? <span className="text-fg-4">from {t.creatorName}</span> : null}
          </div>
        </div>
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
        <button
          type="button"
          onClick={() => openEditDialog(t)}
          className="shrink-0 rounded p-1 text-fg-4 hover:bg-surface-2 hover:text-fg-1"
          aria-label={`Edit ${t.title}`}
        >
          <Pencil size={15} />
        </button>
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
          <Button size="sm" onClick={openNewDialog}>New task</Button>
        </div>
      </div>

      {open.length === 0 && done.length === 0 ? (
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

      <Dialog open={!!dialog} onClose={() => setDialog(null)} title={dialog?.mode === "edit" ? "Edit task" : "New task"}>
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
            <Field label="Due" htmlFor="tk_due">
              <Input id="tk_due" name="due_at" type="datetime-local" defaultValue={toLocalInputValue(dialogTask?.due_at ?? null)} />
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
          <div className="grid grid-cols-2 gap-3">
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
            <Field label="Assign to" htmlFor="tk_assignee_grid">
              <Select id="tk_assignee_grid" name="assignee_id" defaultValue={dialogTask?.assignee_id ?? me}>
                {team.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.id === me ? `${t.full_name} (me)` : t.full_name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Link to a practice, buyer, seller or deal" htmlFor="tk_link">
            <TaskLinkPicker value={link} onChange={setLink} />
          </Field>
          <Field label="Details" htmlFor="tk_details">
            <Textarea id="tk_details" name="details" rows={2} defaultValue={dialogTask?.details ?? ""} />
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
      </Dialog>

      <Dialog open={!!followUp} onClose={() => setFollowUp(null)} title="Task completed">
        <p className="text-sm text-fg-2">Nice work. Want to line up a follow-up?</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" disabled={busy} onClick={() => void createFollowUp(1)}>
            Tomorrow
          </Button>
          <Button variant="outline" size="sm" disabled={busy} onClick={() => void createFollowUp(3)}>
            In 3 days
          </Button>
          <Button variant="outline" size="sm" disabled={busy} onClick={() => void createFollowUp(7)}>
            In a week
          </Button>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setFollowUp(null)}>
            No follow-up
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
