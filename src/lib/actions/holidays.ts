"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notify";
import { audit } from "@/lib/audit";
import { ok, fail, type ActionResult, dbFail } from "@/lib/action-result";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date.");
const portion = z.enum(["full", "am", "pm"]);

const createSchema = z
  .object({
    start_date: isoDate,
    end_date: isoDate,
    start_portion: portion.default("full"),
    end_portion: portion.default("full"),
    reason: z.string().max(1000).nullable().optional(),
  })
  .refine((v) => v.end_date >= v.start_date, {
    message: "The end date can't be before the start date.",
    path: ["end_date"],
  });

/** A staff member requests annual leave. Goes to management as pending. */
export async function createHolidayRequest(input: unknown): Promise<ActionResult<{ id: string }>> {
  const me = await requireProfile();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the dates.");
  const { start_date, end_date, reason } = parsed.data;
  // A single-day request has one portion; keep both boundaries in step.
  const start_portion = parsed.data.start_portion;
  const end_portion = start_date === end_date ? start_portion : parsed.data.end_portion;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("holiday_requests")
    .insert({
      profile_id: me.id,
      start_date,
      end_date,
      start_portion,
      end_portion,
      reason: reason ?? null,
      status: "pending",
    })
    .select("id")
    .single();
  if (error) return dbFail(error);

  // Notify management so it lands in their queue. Cross-user notifications need
  // the service role (notifications are owner-only under RLS).
  const admin = createAdminClient();
  const { data: managers } = await admin
    .from("profiles")
    .select("id")
    .in("role", ["admin", "manager"])
    .eq("is_active", true);
  const label = start_date === end_date ? formatDate(start_date) : `${formatDate(start_date)} – ${formatDate(end_date)}`;
  for (const m of managers ?? []) {
    if (m.id === me.id) continue;
    await notify(m.id, { kind: "holiday_request", title: "Holiday request to review", body: `${me.full_name} — ${label}`, link_url: "/admin/holidays" });
  }

  await audit("holiday_requests", data.id, me.id, [{ field: "created", oldValue: null, newValue: label }]);
  revalidatePath("/holidays");
  revalidatePath("/admin/holidays");
  return ok({ id: data.id });
}

const decideSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  note: z.string().max(1000).nullable().optional(),
});

/**
 * Management approves or declines a request — and can revisit that decision
 * later, changing the outcome and/or the note. The linked calendar event is
 * created when approved and removed when the outcome moves away from approved.
 */
export async function decideHolidayRequest(input: unknown): Promise<ActionResult> {
  const me = await requireRole("manager");
  const parsed = decideSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid decision.");
  const { id, decision, note } = parsed.data;
  const supabase = await createClient();

  const { data: req } = await supabase
    .from("holiday_requests")
    .select("id, profile_id, start_date, end_date, start_portion, status, calendar_event_id")
    .eq("id", id)
    .maybeSingle();
  if (!req) return fail("Request not found.");
  if (req.status === "cancelled") return fail("This request was cancelled by the requester.");

  const wasStatus = req.status;
  let calendarEventId: string | null = req.calendar_event_id;

  if (decision === "approved" && !calendarEventId) {
    // Newly approved (or re-approved) — put it on the diary.
    const { data: requester } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", req.profile_id)
      .single();
    const { data: holidayType } = await supabase
      .from("lookup_values")
      .select("id")
      .eq("system_key", "holiday")
      .maybeSingle();
    const firstName = (requester?.full_name ?? "Staff").split(" ")[0];
    // Annotate a single half-day so the diary reads correctly.
    const halfSuffix =
      req.start_date === req.end_date && req.start_portion !== "full"
        ? req.start_portion === "am"
          ? " (morning)"
          : " (afternoon)"
        : "";

    // All-day, possibly multi-day: FullCalendar treats the end as exclusive, so
    // the event runs [start, end+1). organiser = requester so it shows under
    // their colour on the team diary.
    const endExclusive = new Date(`${req.end_date}T00:00:00Z`);
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
    const { data: event, error: eventError } = await supabase
      .from("calendar_events")
      .insert({
        title: `${firstName} — Annual leave${halfSuffix}`,
        event_type_id: holidayType?.id ?? null,
        starts_at: `${req.start_date}T00:00:00Z`,
        ends_at: endExclusive.toISOString(),
        all_day: true,
        organiser_id: req.profile_id,
        created_by: me.id,
        status: "confirmed",
        visibility: "normal",
        sync_state: "local",
      })
      .select("id")
      .single();
    if (eventError) return dbFail(eventError);
    calendarEventId = event.id;
  } else if (decision === "rejected" && calendarEventId) {
    // Outcome changed from approved to declined — pull it off the diary.
    await supabase.from("calendar_events").delete().eq("id", calendarEventId);
    calendarEventId = null;
  }

  const { error } = await supabase
    .from("holiday_requests")
    .update({
      status: decision,
      decision_note: note ?? null,
      decided_by: me.id,
      decided_at: new Date().toISOString(),
      calendar_event_id: calendarEventId,
    })
    .eq("id", id);
  if (error) return dbFail(error);

  // Let the requester know the outcome (or the revised one).
  await notify(req.profile_id, {
    kind: "holiday_decision",
    title: decision === "approved" ? "Holiday approved" : "Holiday declined",
    body:
      decision === "approved"
        ? `Your leave from ${formatDate(req.start_date)} is approved.`
        : `Your leave request was declined${note ? ` — ${note}` : ""}.`,
    link_url: "/holidays",
  });

  await audit("holiday_requests", id, me.id, [{ field: "status", oldValue: wasStatus, newValue: decision }]);
  revalidatePath("/holidays");
  revalidatePath("/admin/holidays");
  revalidatePath("/calendar");
  return ok();
}

/** The requester (or management) cancels a request; removes any diary entry. */
export async function cancelHolidayRequest(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();

  const { data: req } = await supabase
    .from("holiday_requests")
    .select("id, profile_id, status, calendar_event_id")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!req) return fail("Request not found.");

  const isManagement = me.role === "admin" || me.role === "manager";
  if (req.profile_id !== me.id && !isManagement) return fail("You can only cancel your own requests.");
  if (req.status === "cancelled" || req.status === "rejected") return fail("This request is already closed.");

  if (req.calendar_event_id) {
    await supabase.from("calendar_events").delete().eq("id", req.calendar_event_id);
  }
  const { error } = await supabase
    .from("holiday_requests")
    .update({ status: "cancelled", calendar_event_id: null })
    .eq("id", req.id);
  if (error) return dbFail(error);

  // If a manager cancelled someone else's approved leave, tell them.
  if (req.profile_id !== me.id) {
    await notify(req.profile_id, { kind: "holiday_decision", title: "Holiday cancelled", body: `${me.full_name} cancelled a holiday booking.`, link_url: "/holidays" });
  }

  await audit("holiday_requests", req.id, me.id, [{ field: "status", oldValue: req.status, newValue: "cancelled" }]);
  revalidatePath("/holidays");
  revalidatePath("/admin/holidays");
  revalidatePath("/calendar");
  return ok();
}

/** DD/MM/YYYY for notification bodies (server-side, no locale surprises). */
function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
