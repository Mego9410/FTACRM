"use client";

import * as React from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput } from "@fullcalendar/core";
import type { LookupValue } from "@/lib/lookups";
import type { Recurrence } from "@/lib/calendar/recurrence";
import { Avatar, Button, Card, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  cancelCalendarEvent,
  getCalendarEvents,
  saveCalendarEvent,
  type CalendarEventDto,
} from "./actions";

const WEEKDAYS: { d: number; label: string }[] = [
  { d: 1, label: "Mon" },
  { d: 2, label: "Tue" },
  { d: 3, label: "Wed" },
  { d: 4, label: "Thu" },
  { d: 5, label: "Fri" },
  { d: 6, label: "Sat" },
  { d: 0, label: "Sun" },
];

const REMINDER_PRESETS: { label: string; minutes: number }[] = [
  { label: "At start", minutes: 0 },
  { label: "5 min", minutes: 5 },
  { label: "10 min", minutes: 10 },
  { label: "15 min", minutes: 15 },
  { label: "30 min", minutes: 30 },
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
  { label: "1 day", minutes: 1440 },
  { label: "2 days", minutes: 2880 },
  { label: "1 week", minutes: 10080 },
];

const freqUnit = (f: Recurrence["freq"]) => (f === "daily" ? "days" : f === "weekly" ? "weeks" : "months");

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
  recurrence: Recurrence | null;
  reminder_minutes: number[];
  isRecurringSeries?: boolean;
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
            // Unique per occurrence so a recurring series renders every instance.
            id: `${e.id}::${e.starts_at}`,
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
      recurrence: null,
      reminder_minutes: [],
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
      recurrence: editor.recurrence,
      reminder_minutes: editor.reminder_minutes,
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
              // Load the series anchor — editing changes the whole series.
              starts_at: toLocalInput(new Date(e.series_starts_at)),
              ends_at: toLocalInput(new Date(e.series_ends_at)),
              all_day: e.all_day,
              location: e.location ?? "",
              body: e.body ?? "",
              attendee_profile_ids: e.attendee_profile_ids,
              visibility: "normal",
              recurrence: e.recurrence,
              reminder_minutes: e.reminder_minutes,
              isRecurringSeries: e.recurrence !== null,
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

            {/* Recurrence */}
            <div className="rounded-md border border-line p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Repeat" htmlFor="ev_repeat">
                  <Select
                    id="ev_repeat"
                    value={editor.recurrence?.freq ?? "none"}
                    disabled={editor.readonly}
                    onChange={(ev) => {
                      const v = ev.target.value;
                      setEditor((s) => {
                        if (!s) return s;
                        if (v === "none") return { ...s, recurrence: null };
                        const freq = v as Recurrence["freq"];
                        const startDay = new Date(s.starts_at).getDay();
                        return {
                          ...s,
                          recurrence: {
                            freq,
                            interval: s.recurrence?.interval ?? 1,
                            byday:
                              freq === "weekly"
                                ? s.recurrence?.byday?.length
                                  ? s.recurrence.byday
                                  : [startDay]
                                : undefined,
                            end: s.recurrence?.end ?? { type: "never" },
                          },
                        };
                      });
                    }}
                  >
                    <option value="none">Does not repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </Select>
                </Field>
                {editor.recurrence ? (
                  <Field label={`Every (${freqUnit(editor.recurrence.freq)})`} htmlFor="ev_interval">
                    <Input
                      id="ev_interval"
                      type="number"
                      min={1}
                      max={99}
                      value={editor.recurrence.interval}
                      disabled={editor.readonly}
                      onChange={(ev) =>
                        setEditor((s) =>
                          s && s.recurrence
                            ? { ...s, recurrence: { ...s.recurrence, interval: Math.max(1, Number(ev.target.value) || 1) } }
                            : s,
                        )
                      }
                    />
                  </Field>
                ) : null}
              </div>

              {editor.recurrence?.freq === "weekly" ? (
                <div className="mt-3">
                  <p className="mb-1.5 text-[12px] font-semibold text-fg-2">On these days</p>
                  <div className="flex flex-wrap gap-1">
                    {WEEKDAYS.map((w) => {
                      const on = editor.recurrence?.byday?.includes(w.d) ?? false;
                      return (
                        <button
                          key={w.d}
                          type="button"
                          disabled={editor.readonly}
                          onClick={() =>
                            setEditor((s) => {
                              if (!s || !s.recurrence) return s;
                              const cur = s.recurrence.byday ?? [];
                              const byday = on ? cur.filter((d) => d !== w.d) : [...cur, w.d];
                              return { ...s, recurrence: { ...s.recurrence, byday } };
                            })
                          }
                          className={cn(
                            "h-8 w-10 rounded-md text-[12px] font-semibold",
                            on ? "bg-ink text-white" : "bg-surface-3 text-fg-2 hover:text-fg-1",
                          )}
                        >
                          {w.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {editor.recurrence ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
                  <span className="font-semibold text-fg-2">Ends</span>
                  <Select
                    value={editor.recurrence.end.type}
                    disabled={editor.readonly}
                    className="w-36"
                    onChange={(ev) =>
                      setEditor((s) => {
                        if (!s || !s.recurrence) return s;
                        const t = ev.target.value;
                        const end =
                          t === "on"
                            ? { type: "on" as const, date: new Date(s.starts_at).toISOString().slice(0, 10) }
                            : t === "after"
                              ? { type: "after" as const, count: 10 }
                              : { type: "never" as const };
                        return { ...s, recurrence: { ...s.recurrence, end } };
                      })
                    }
                  >
                    <option value="never">Never</option>
                    <option value="on">On date</option>
                    <option value="after">After…</option>
                  </Select>
                  {editor.recurrence.end.type === "on" ? (
                    <Input
                      type="date"
                      className="w-44"
                      value={editor.recurrence.end.date}
                      disabled={editor.readonly}
                      onChange={(ev) =>
                        setEditor((s) =>
                          s && s.recurrence && s.recurrence.end.type === "on"
                            ? { ...s, recurrence: { ...s.recurrence, end: { type: "on", date: ev.target.value } } }
                            : s,
                        )
                      }
                    />
                  ) : null}
                  {editor.recurrence.end.type === "after" ? (
                    <span className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={1}
                        max={999}
                        className="w-20"
                        value={editor.recurrence.end.count}
                        disabled={editor.readonly}
                        onChange={(ev) =>
                          setEditor((s) =>
                            s && s.recurrence && s.recurrence.end.type === "after"
                              ? {
                                  ...s,
                                  recurrence: {
                                    ...s.recurrence,
                                    end: { type: "after", count: Math.max(1, Number(ev.target.value) || 1) },
                                  },
                                }
                              : s,
                          )
                        }
                      />
                      <span className="text-fg-3">occurrences</span>
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Reminders */}
            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-fg-1">Reminders</p>
              <div className="flex flex-wrap gap-1.5">
                {REMINDER_PRESETS.map((r) => {
                  const on = editor.reminder_minutes.includes(r.minutes);
                  return (
                    <button
                      key={r.minutes}
                      type="button"
                      disabled={editor.readonly}
                      onClick={() =>
                        setEditor((s) => {
                          if (!s) return s;
                          const on2 = s.reminder_minutes.includes(r.minutes);
                          const reminder_minutes = on2
                            ? s.reminder_minutes.filter((m) => m !== r.minutes)
                            : [...s.reminder_minutes, r.minutes].sort((a, b) => a - b);
                          return { ...s, reminder_minutes };
                        })
                      }
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[12px] font-semibold",
                        on ? "bg-gold text-ink" : "bg-surface-3 text-fg-2 hover:text-fg-1",
                      )}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-[11px] text-fg-4">
                {editor.reminder_minutes.length
                  ? "You'll be reminded before the event at the times ticked."
                  : "Pick one or more times to be reminded before the event."}
              </p>
            </div>

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
