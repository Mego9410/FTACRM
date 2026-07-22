/**
 * Calendar recurrence — a small, pure rule engine. Given a series' first
 * occurrence and a rule, it lists the concrete occurrences that fall inside a
 * bounded window (a calendar view fetches at most a few weeks). Deliberately
 * covers the common cases (daily / weekly-by-weekday / monthly) with an
 * interval and an end condition — not the full RFC 5545 grammar.
 */

export type RecurrenceEnd =
  | { type: "never" }
  | { type: "on"; date: string } // inclusive, "YYYY-MM-DD"
  | { type: "after"; count: number };

export type Recurrence = {
  freq: "daily" | "weekly" | "monthly";
  interval: number; // >= 1
  /** Weekly only — weekdays to repeat on, 0=Sun … 6=Sat. Empty = the series' own weekday. */
  byday?: number[];
  end: RecurrenceEnd;
};

export type Occurrence = { start: Date; end: Date };

// Hard cap so a runaway rule can never generate unbounded work.
const MAX_OCCURRENCES = 750;

const DAY_MS = 86_400_000;

function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

function startOfWeekSunday(d: Date): Date {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  return addDays(s, -s.getDay());
}

/** Copy the time-of-day from `time` onto the calendar date of `date`. */
function withTime(date: Date, time: Date): Date {
  const out = new Date(date);
  out.setHours(time.getHours(), time.getMinutes(), time.getSeconds(), time.getMilliseconds());
  return out;
}

/**
 * Expand a recurring series into concrete occurrences overlapping
 * [windowFrom, windowTo). The first occurrence is `seriesStart`; each
 * occurrence keeps the same duration.
 */
export function expandRecurrence(
  seriesStart: Date,
  durationMs: number,
  rule: Recurrence,
  windowFrom: Date,
  windowTo: Date,
): Occurrence[] {
  const interval = Math.max(1, Math.floor(rule.interval || 1));
  const untilDate =
    rule.end.type === "on" ? new Date(`${rule.end.date}T23:59:59`) : null;
  const maxCount = rule.end.type === "after" ? Math.max(1, rule.end.count) : Infinity;

  const out: Occurrence[] = [];
  let emitted = 0; // counts every occurrence from the series start (for `after`)
  let generated = 0;

  const push = (start: Date): "stop" | "continue" => {
    if (emitted >= maxCount) return "stop";
    if (untilDate && start > untilDate) return "stop";
    emitted += 1;
    generated += 1;
    const end = new Date(start.getTime() + durationMs);
    // Overlaps the window if it starts before the window ends and ends after it begins.
    if (start < windowTo && end > windowFrom) out.push({ start, end });
    if (generated >= MAX_OCCURRENCES) return "stop";
    // Past the window and only moving further away — safe to stop.
    if (start >= windowTo) return "stop";
    return "continue";
  };

  if (rule.freq === "daily") {
    let cursor = new Date(seriesStart);
    while (push(cursor) === "continue") cursor = addDays(cursor, interval);
    return out;
  }

  if (rule.freq === "weekly") {
    const days = (rule.byday && rule.byday.length ? [...rule.byday] : [seriesStart.getDay()])
      .filter((d) => d >= 0 && d <= 6)
      .sort((a, b) => a - b);
    let weekStart = startOfWeekSunday(seriesStart);
    let stop = false;
    while (!stop) {
      for (const wd of days) {
        const start = withTime(addDays(weekStart, wd), seriesStart);
        if (start < seriesStart) continue; // skip days before the series begins in week 0
        if (push(start) === "stop") {
          stop = true;
          break;
        }
      }
      // Bail out if we've walked past the window (guards empty-byday rules too).
      if (weekStart.getTime() > windowTo.getTime() + 7 * DAY_MS) break;
      weekStart = addDays(weekStart, 7 * interval);
    }
    return out;
  }

  // monthly — same day-of-month as the series start, every `interval` months.
  const dom = seriesStart.getDate();
  let n = 0;
  while (true) {
    const candidate = new Date(seriesStart);
    candidate.setMonth(candidate.getMonth() + n * interval);
    n += 1;
    // Skip months that don't have this day (e.g. the 31st in a 30-day month).
    if (candidate.getDate() !== dom) {
      if (candidate.getTime() > windowTo.getTime() && emitted >= 1) break;
      if (n > MAX_OCCURRENCES) break;
      continue;
    }
    if (push(candidate) === "stop") break;
  }
  return out;
}
