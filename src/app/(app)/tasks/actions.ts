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
  contact_id: z.string().uuid().nullable().optional(),
  practice_id: z.string().uuid().nullable().optional(),
  deal_id: z.string().uuid().nullable().optional(),
});

export async function saveTask(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return fail("The task needs a title.");
  const { id, ...fields } = parsed.data;
  const supabase = await createClient();

  if (id) {
    const { data: existing } = await supabase.from("tasks").select("assignee_id").eq("id", id).single();
    const { error } = await supabase.from("tasks").update(fields).eq("id", id);
    if (error) return fail(error.message);
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
    const { error } = await supabase
      .from("tasks")
      .insert({ ...fields, assignee_id: assignee, created_by: me.id });
    if (error) return fail(error.message);
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
  return ok();
}

export async function setTaskStatus(input: unknown): Promise<ActionResult> {
  await requireProfile();
  const parsed = z
    .object({ id: z.string().uuid(), status: z.enum(["open", "done", "cancelled"]) })
    .safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({
      status: parsed.data.status,
      completed_at: parsed.data.status === "done" ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.id);
  if (error) return fail(error.message);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return ok();
}
