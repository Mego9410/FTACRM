"use client";

import * as React from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput } from "@fullcalendar/core";
import type { LookupValue } from "@/lib/lookups";
import { Avatar, Button, Card, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  cancelCalendarEvent,
  getCalendarEvents,
  saveCalendarEvent,
  type CalendarEventDto,
} from "./actions";

type TeamMember = { id: string; full_name: string; calendar_color: string };

type EditorState = {
  id?: string;
  title: string;
  event_type_id: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  location: string;
  body: string;
  attendee_profile_ids: string[];
  visibility: "normal" | "private";
  readonly?: boolean;
} | null;

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CalendarClient({
  me,
  team,
  eventTypes,
}: {
  me: string;
  team: TeamMember[];
  eventTypes: LookupValue[];
}) {
  const [events, setEvents] = React.useState<CalendarEventDto[]>([]);
  const [visible, setVisible] = React.useState<Set<string>>(new Set([me]));
  const [editor, setEditor] = React.useState<EditorState>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const rangeRef = React.useRef<{ from: string; to: string } | null>(null);

  // Persist overlay selection per user.
  React.useEffect(() => {
    const stored = window.localStorage.getItem("fta-calendar-overlay");
    if (stored) {
      try {
        const ids = JSON.parse(stored) as string[];
        if (Array.isArray(ids) && ids.length > 0) setVisible(new Set(ids));
      } catch {
        /* ignore */
      }
    }
  }, []);
  React.useEffect(() => {
    window.localStorage.setItem("fta-calendar-overlay", JSON.stringify([...visible]));
  }, [visible]);

  const load = React.useCallback(async () => {
    if (!rangeRef.current) return;
    setEvents(await getCalendarEvents(rangeRef.current));
  }, []);

  const fcEvents: EventInput[] = React.useMemo(
    () =>
      events
        .filter(
          (e) =>
            e.attendee_profile_ids.some((id) => visible.has(id)) ||
            (e.organiser_id !== null && visible.has(e.organiser_id)),
        )
        .map((e) => {
          const organiserColor =
            team.find((t) => t.id === e.organiser_id)?.calendar_color ?? "#5E5E5A";
          return {
            id: e.id,
            title: e.title,
            start: e.starts_at,
            end: e.ends_at,
            allDay: e.all_day,
            backgroundColor: e.color,
            borderColor: organiserColor,
            extendedProps: e,
          };
        }),
    [events, visible, team],
  );

  function openNew(start?: Date, end?: Date) {
    const s = start ?? new Date();
    const e = end ?? new Date(s.getTime() + 60 * 60000);
    setEditor({
      title: "",
      event_type_id: eventTypes.find((t) => t.system_key === "meeting")?.id ?? "",
      starts_at: toLocalInput(s),
      ends_at: toLocalInput(e),
      all_day: false,
      location: "",
      body: "",
      attendee_profile_ids: [me],
      visibility: "normal",
    });
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editor) return;
    setBusy(true);
    setError(null);
    const res = await saveCalendarEvent({
      id: editor.id,
      title: editor.title,
      event_type_id: editor.event_type_id || null,
      starts_at: new Date(editor.starts_at).toISOString(),
      ends_at: new Date(editor.ends_at).toISOString(),
      all_day: editor.all_day,
      location: editor.location || null,
      body: editor.body || null,
      attendee_profile_ids: editor.attendee_profile_ids,
      visibility: editor.visibility,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setEditor(null);
    void load();
  }

  return (
    <div className="flex flex-col gap-5 lg:flex-row">
      <div className="shrink-0 space-y-4 lg:w-60">
        <Button className="w-full" onClick={() => openNew()}>
          Add event
        </Button>
        <Card className="p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-bold text-fg-1">Team</p>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setVisible(new Set([me]))}
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-fg-3 hover:bg-surface-3"
              >
                Just me
              </button>
              <button
                type="button"
                onClick={() => setVisible(new Set(team.map((t) => t.id)))}
                className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-fg-3 hover:bg-surface-3"
              >
                Everyone
              </button>
            </div>
          </div>
          <ul className="space-y-0.5">
            {team.map((t) => (
              <li key={t.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-[8px] px-1.5 py-1 hover:bg-surface-2">
                  <input
                    type="checkbox"
                    checked={visible.has(t.id)}
                    onChange={(e) =>
                      setVisible((v) => {
                        const next = new Set(v);
                        if (e.target.checked) next.add(t.id);
                        else next.delete(t.id);
                        return next;
                      })
                    }
                    className="h-3.5 w-3.5"
                    style={{ accentColor: t.calendar_color }}
                  />
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.calendar_color }} />
                  <span className={cn("text-[13px] font-medium", t.id === me ? "text-fg-1" : "text-fg-2")}>
                    {t.full_name}
                    {t.id === me ? " (me)" : ""}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-3">
          <p className="mb-2 text-[13px] font-bold text-fg-1">Event types</p>
          <ul className="space-y-1">
            {eventTypes.map((t) => (
              <li key={t.id} className="flex items-center gap-2 text-[13px] text-fg-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color ?? "#5E5E5A" }} />
                {t.value}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="min-w-0 flex-1 p-4">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{ left: "prev,next today", center: "title", right: "dayGridMonth,timeGridWeek,timeGridDay" }}
          height="auto"
          firstDay={1}
          locale="en-gb"
          buttonText={{ today: "Today", month: "Month", week: "Week", day: "Day" }}
          events={fcEvents}
          selectable
          datesSet={(arg) => {
            rangeRef.current = { from: arg.start.toISOString(), to: arg.end.toISOString() };
            void load();
          }}
          select={(arg) => openNew(arg.start, arg.end)}
          eventClick={(arg) => {
            const e = arg.event.extendedProps as CalendarEventDto;
            if (e.is_private_other) return;
            setEditor({
              id: e.id,
              title: e.title,
              event_type_id: e.event_type_id ?? "",
              starts_at: toLocalInput(new Date(e.starts_at)),
              ends_at: toLocalInput(new Date(e.ends_at)),
              all_day: e.all_day,
              location: e.location ?? "",
              body: e.body ?? "",
              attendee_profile_ids: e.attendee_profile_ids,
              visibility: "normal",
              readonly: e.organiser_id !== me && !e.attendee_profile_ids.includes(me),
            });
          }}
        />
      </Card>

      <Dialog open={!!editor} onClose={() => setEditor(null)} title={editor?.id ? "Event" : "Add event"} wide>
        {editor ? (
          <form onSubmit={submit} className="space-y-4">
            <Field label="Title" htmlFor="ev_title">
              <Input
                id="ev_title"
                value={editor.title}
                onChange={(e) => setEditor((s) => (s ? { ...s, title: e.target.value } : s))}
                required
                disabled={editor.readonly}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Starts" htmlFor="ev_start">
                <Input
                  id="ev_start"
                  type="datetime-local"
                  value={editor.starts_at}
                  onChange={(e) => setEditor((s) => (s ? { ...s, starts_at: e.target.value } : s))}
                  required
                  disabled={editor.readonly}
                />
              </Field>
              <Field label="Ends" htmlFor="ev_end">
                <Input
                  id="ev_end"
                  type="datetime-local"
                  value={editor.ends_at}
                  onChange={(e) => setEditor((s) => (s ? { ...s, ends_at: e.target.value } : s))}
                  required
                  disabled={editor.readonly}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type" htmlFor="ev_type">
                <Select
                  id="ev_type"
                  value={editor.event_type_id}
                  onChange={(e) => setEditor((s) => (s ? { ...s, event_type_id: e.target.value } : s))}
                  disabled={editor.readonly}
                >
                  {eventTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.value}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Location" htmlFor="ev_location">
                <Input
                  id="ev_location"
                  value={editor.location}
                  onChange={(e) => setEditor((s) => (s ? { ...s, location: e.target.value } : s))}
                  disabled={editor.readonly}
                />
              </Field>
            </div>
            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-fg-1">Attendees</p>
              <div className="flex flex-wrap gap-1.5">
                {team.map((t) => {
                  const active = editor.attendee_profile_ids.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      disabled={editor.readonly}
                      onClick={() =>
                        setEditor((s) =>
                          s
                            ? {
                                ...s,
                                attendee_profile_ids: active
                                  ? s.attendee_profile_ids.filter((x) => x !== t.id)
                                  : [...s.attendee_profile_ids, t.id],
                              }
                            : s,
                        )
                      }
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold",
                        active ? "bg-ink text-white" : "bg-surface-3 text-fg-2 hover:text-fg-1",
                      )}
                    >
                      <Avatar name={t.full_name} size={16} color={t.calendar_color} />
                      {t.full_name.split(" ")[0]}
                    </button>
                  );
                })}
              </div>
            </div>
            <Field label="Notes" htmlFor="ev_body">
              <Textarea
                id="ev_body"
                value={editor.body}
                onChange={(e) => setEditor((s) => (s ? { ...s, body: e.target.value } : s))}
                rows={3}
                disabled={editor.readonly}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm font-semibold text-fg-1">
              <input
                type="checkbox"
                checked={editor.visibility === "private"}
                disabled={editor.readonly}
                onChange={(e) =>
                  setEditor((s) => (s ? { ...s, visibility: e.target.checked ? "private" : "normal" } : s))
                }
                className="h-4 w-4 accent-[#E4AD25]"
              />
              Private — colleagues see busy time only
            </label>
            {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
            {!editor.readonly ? (
              <DialogFooter>
                {editor.id ? (
                  <Button
                    type="button"
                    variant="danger"
                    onClick={async () => {
                      if (!window.confirm("Cancel this event?")) return;
                      await cancelCalendarEvent({ id: editor.id });
                      setEditor(null);
                      void load();
                    }}
                  >
                    Cancel event
                  </Button>
                ) : null}
                <Button type="button" variant="ghost" onClick={() => setEditor(null)}>Close</Button>
                <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
              </DialogFooter>
            ) : (
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setEditor(null)}>Close</Button>
              </DialogFooter>
            )}
          </form>
        ) : null}
      </Dialog>
    </div>
  );
}
