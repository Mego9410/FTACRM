// Pure helpers for the holiday module — safe to import from both server and
// client components (no server-only imports here).

export type HolidayStatus = "pending" | "approved" | "rejected" | "cancelled";
export type DayPortion = "full" | "am" | "pm";

export const HOLIDAY_LABEL: Record<HolidayStatus, string> = {
  pending: "Awaiting approval",
  approved: "Approved",
  rejected: "Declined",
  cancelled: "Cancelled",
};

export const HOLIDAY_TONE: Record<HolidayStatus, "warn" | "green" | "danger" | "neutral"> = {
  pending: "warn",
  approved: "green",
  rejected: "danger",
  cancelled: "neutral",
};

export const PORTION_LABEL: Record<DayPortion, string> = {
  full: "Full day",
  am: "Morning",
  pm: "Afternoon",
};

function isWeekday(d: Date): boolean {
  const g = d.getUTCDay();
  return g !== 0 && g !== 6;
}

/**
 * Working (Mon–Fri) days covered by an inclusive range, honouring half-day
 * portions on the first and last day. A weekend boundary contributes nothing.
 */
export function holidayDays(
  start: string,
  end: string,
  startPortion: DayPortion = "full",
  endPortion: DayPortion = "full",
): number {
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  if (start === end) return isWeekday(s) ? (startPortion === "full" ? 1 : 0.5) : 0;

  let total = 0;
  for (const d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
    if (!isWeekday(d)) continue;
    const iso = d.toISOString().slice(0, 10);
    if (iso === start) total += startPortion === "full" ? 1 : 0.5;
    else if (iso === end) total += endPortion === "full" ? 1 : 0.5;
    else total += 1;
  }
  return total;
}

/** "1 working day" / "0.5 working days" / "3 working days". */
export function daysLabel(n: number): string {
  return `${n} working day${n === 1 ? "" : "s"}`;
}
