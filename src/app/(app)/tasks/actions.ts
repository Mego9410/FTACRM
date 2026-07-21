"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, fail, type ActionResult } from "@/lib/action-result";

const taskSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  details: z.string().max(5000).nullable(),
  due_at: z.string().nullable(),
  assignee_id: z.string().uuid().nullable(),
  category_id: z.string().uuid().nullable(),
  task_type: z.enum(["todo", "call", "email"]).optional(),
  priority: z.enum(["low", "medium", "high"]).nullable().optional(),
  stage: z.enum(["not_started", "in_progress", "waiting", "completed", "deferred"]).optional(),
  start_at: z.string().nullable().optional(),
  queue: z.string().max(120).nullable().optional(),
  recurrence: z.enum(["daily", "weekly", "monthly"]).nullable().optional(),
  reminder_at: z.string().nullable().optional(),
  /** Full set of record associations for this task. Replaces any existing links. */
  links: z
    .array(z.object({ column: z.enum(["contact_id", "practice_id", "deal_id"]), id: z.string().uuid() }))
    .optional(),
  /** Extra path to revalidate (e.g. a record detail page the task lives on). */
  path: z.string().max(200).optional(),
});

async function syncTaskLinks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  taskId: string,
  links: { column: "contact_id" | "practice_id" | "deal_id"; id: string }[],
) {
  await supabase.from("task_links").delete().eq("task_id", taskId);
  if (links.length > 0) {
    await supabase.from("task_links").insert(links.map((l) => ({ task_id: taskId, [l.column]: l.id })));
  }
}

export async function saveTask(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return fail("The task needs a title.");
  const { id, path, links, ...fields } = parsed.data;
  const supabase = await createClient();

  // Denormalised "primary" pointer (first link of each type) for light displays.
  const writeFields: Record<string, unknown> = { ...fields };
  if (fields.reminder_at !== undefined) writeFields.reminded_at = null;
  // Keep the binary status in sync with the stage.
  if (fields.stage !== undefined) {
    const done = fields.stage === "completed";
    writeFields.status = done ? "done" : "open";
    writeFields.completed_at = done ? new Date().toISOString() : null;
  }
  if (links !== undefined) {
    writeFields.contact_id = links.find((l) => l.column === "contact_id")?.id ?? null;
    writeFields.practice_id = links.find((l) => l.column === "practice_id")?.id ?? null;
    writeFields.deal_id = links.find((l) => l.column === "deal_id")?.id ?? null;
  }

  if (id) {
    const { data: existing } = await supabase.from("tasks").select("assignee_id").eq("id", id).single();
    const { error } = await supabase.from("tasks").update(writeFields).eq("id", id);
    if (error) return fail(error.message);
    if (links !== undefined) await syncTaskLinks(supabase, id, links);
    const newAssignee = fields.assignee_id;
    if (newAssignee && newAssignee !== me.id && newAssignee !== existing?.assignee_id) {
      const admin = createAdminClient();
      await admin.from("notifications").insert({
        profile_id: newAssignee,
        kind: "task_assigned",
        title: "Task assigned to you",
        body: fields.title,
        link_url: "/tasks",
      });
    }
  } else {
    const assignee = fields.assignee_id ?? me.id;
    const { data: created, error } = await supabase
      .from("tasks")
      .insert({ ...writeFields, assignee_id: assignee, created_by: me.id })
      .select("id")
      .single();
    if (error) return fail(error.message);
    if (created && links && links.length > 0) await syncTaskLinks(supabase, created.id, links);
    if (assignee !== me.id) {
      const admin = createAdminClient();
      await admin.from("notifications").insert({
        profile_id: assignee,
        kind: "task_assigned",
        title: "New task assigned",
        body: fields.title,
        link_url: "/tasks",
      });
    }
  }
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  if (path) revalidatePath(path);
  return ok();
}

/** When a recurring task is completed, spin up the next occurrence. */
async function spawnRecurrence(supabase: Awaited<ReturnType<typeof createClient>>, taskId: string, me: string) {
  const { data: t } = await supabase
    .from("tasks")
    .select("title, details, due_at, start_at, assignee_id, category_id, task_type, priority, queue, recurrence, task_links(contact_id, practice_id, deal_id)")
    .eq("id", taskId)
    .single();
  const task = t as unknown as {
    title: string; details: string | null; due_at: string | null; start_at: string | null;
    assignee_id: string | null; category_id: string | null; task_type: string | null;
    priority: string | null; queue: string | null; recurrence: string | null;
    task_links: { contact_id: string | null; practice_id: string | null; deal_id: string | null }[];
  } | null;
  if (!task || !task.recurrence || !task.due_at) return;

  const next = new Date(task.due_at);
  if (task.recurrence === "daily") next.setDate(next.getDate() + 1);
  else if (task.recurrence === "weekly") next.setDate(next.getDate() + 7);
  else if (task.recurrence === "monthly") next.setMonth(next.getMonth() + 1);

  const { data: created } = await supabase
    .from("tasks")
    .insert({
      title: task.title,
      details: task.details,
      due_at: next.toISOString(),
      start_at: task.start_at,
      assignee_id: task.assignee_id,
      created_by: me,
      category_id: task.category_id,
      task_type: task.task_type ?? "todo",
      priority: task.priority,
      queue: task.queue,
      recurrence: task.recurrence,
      stage: "not_started",
      status: "open",
    })
    .select("id")
    .single();
  const links = (task.task_links ?? []).filter((l) => l.contact_id || l.practice_id || l.deal_id);
  if (created && links.length > 0) {
    await supabase.from("task_links").insert(links.map((l) => ({ task_id: created.id, ...l })));
  }
}

export async function setTaskStatus(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = z
    .object({ id: z.string().uuid(), status: z.enum(["open", "done", "cancelled"]), path: z.string().max(200).optional() })
    .safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();
  const done = parsed.data.status === "done";
  const { error } = await supabase
    .from("tasks")
    .update({
      status: parsed.data.status,
      stage: done ? "completed" : parsed.data.status === "open" ? "not_started" : "not_started",
      completed_at: done ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.id);
  if (error) return fail(error.message);
  if (done) await spawnRecurrence(supabase, parsed.data.id, me.id);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  if (parsed.data.path) revalidatePath(parsed.data.path);
  return ok();
}

export async function setTaskStage(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = z
    .object({
      id: z.string().uuid(),
      stage: z.enum(["not_started", "in_progress", "waiting", "completed", "deferred"]),
      path: z.string().max(200).optional(),
    })
    .safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();
  const done = parsed.data.stage === "completed";
  const { error } = await supabase
    .from("tasks")
    .update({ stage: parsed.data.stage, status: done ? "done" : "open", completed_at: done ? new Date().toISOString() : null })
    .eq("id", parsed.data.id);
  if (error) return fail(error.message);
  if (done) await spawnRecurrence(supabase, parsed.data.id, me.id);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  if (parsed.data.path) revalidatePath(parsed.data.path);
  return ok();
}
