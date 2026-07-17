"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ok, fail, type ActionResult } from "@/lib/action-result";

export type CalendarEventDto = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  status: string;
  color: string;
  organiser_id: string | null;
  attendee_profile_ids: string[];
  type_value: string | null;
  location: string | null;
  body: string | null;
  event_type_id: string | null;
  practice_id: string | null;
  contact_id: string | null;
  deal_id: string | null;
  is_private_other: boolean;
};

export async function getCalendarEvents(input: unknown): Promise<CalendarEventDto[]> {
  const me = await requireProfile();
  const parsed = z.object({ from: z.string(), to: z.string() }).safeParse(input);
  if (!parsed.success) return [];
  const supabase = await createClient();

  const { data: events } = await supabase
    .from("calendar_events")
    .select(
      "id, title, starts_at, ends_at, all_day, status, location, body, organiser_id, event_type_id, practice_id, contact_id, deal_id, visibility, lookup_values!calendar_events_event_type_id_fkey(value, color), calendar_event_attendees(profile_id)",
    )
    .gte("starts_at", parsed.data.from)
    .lte("starts_at", parsed.data.to)
    .neq("status", "cancelled")
    .limit(2000);

  return (events ?? []).map((e) => {
    const type = e.lookup_values as unknown as { value: string; color: string | null } | null;
    const attendees = ((e.calendar_event_attendees as { profile_id: string | null }[]) ?? [])
      .map((a) => a.profile_id)
      .filter((x): x is string => !!x);
    const isPrivateOther = e.visibility === "private" && e.organiser_id !== me.id;
    return {
      id: e.id,
      title: isPrivateOther ? "Busy" : e.title,
      starts_at: e.starts_at,
      ends_at: e.ends_at,
      all_day: e.all_day,
      status: e.status,
      color: type?.color ?? "#5E5E5A",
      organiser_id: e.organiser_id,
      attendee_profile_ids: attendees,
      type_value: type?.value ?? null,
      location: isPrivateOther ? null : e.location,
      body: isPrivateOther ? null : e.body,
      event_type_id: e.event_type_id,
      practice_id: e.practice_id,
      contact_id: e.contact_id,
      deal_id: e.deal_id,
      is_private_other: isPrivateOther,
    };
  });
}

const eventSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  event_type_id: z.string().uuid().nullable(),
  starts_at: z.string(),
  ends_at: z.string(),
  all_day: z.boolean(),
  location: z.string().max(300).nullable(),
  body: z.string().max(5000).nullable(),
  attendee_profile_ids: z.array(z.string().uuid()),
  visibility: z.enum(["normal", "private"]),
});

export async function saveCalendarEvent(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return fail("Check the event fields.");
  const { id, attendee_profile_ids, ...fields } = parsed.data;
  if (new Date(fields.ends_at) <= new Date(fields.starts_at)) {
    return fail("The event must end after it starts.");
  }
  const supabase = await createClient();

  let eventId = id;
  if (eventId) {
    const { data: existing } = await supabase
      .from("calendar_events")
      .select("organiser_id, external_source")
      .eq("id", eventId)
      .single();
    if (!existing) return fail("Event not found.");
    if (existing.external_source) return fail("This event lives in Outlook — edit it there.");
    if (existing.organiser_id !== me.id && me.role !== "admin") {
      return fail("Only the organiser can edit this event.");
    }
    const { error } = await supabase.from("calendar_events").update(fields).eq("id", eventId);
    if (error) return fail(error.message);
    await supabase.from("calendar_event_attendees").delete().eq("event_id", eventId).not("profile_id", "is", null);
  } else {
    const { data, error } = await supabase
      .from("calendar_events")
      .insert({ ...fields, organiser_id: me.id, created_by: me.id, sync_state: "local" })
      .select("id")
      .single();
    if (error) return fail(error.message);
    eventId = data.id;
  }

  const attendees = new Set([...attendee_profile_ids, me.id]);
  const { error: attendeesError } = await supabase
    .from("calendar_event_attendees")
    .insert([...attendees].map((profile_id) => ({ event_id: eventId, profile_id })));
  if (attendeesError) return fail(attendeesError.message);

  revalidatePath("/calendar");
  return ok();
}

export async function cancelCalendarEvent(input: unknown): Promise<ActionResult> {
  const me = await requireProfile();
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return fail("Invalid.");
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("calendar_events")
    .select("organiser_id")
    .eq("id", parsed.data.id)
    .single();
  if (!existing) return fail("Event not found.");
  if (existing.organiser_id !== me.id && me.role !== "admin") {
    return fail("Only the organiser can cancel this event.");
  }
  const { error } = await supabase
    .from("calendar_events")
    .update({ status: "cancelled" })
    .eq("id", parsed.data.id);
  if (error) return fail(error.message);
  revalidatePath("/calendar");
  return ok();
}
