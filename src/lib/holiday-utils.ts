// Pure helpers for the holiday module — safe to import from both server and
// client components (no server-only imports here).

export type HolidayStatus = "pending" | "approved" | "rejected" | "cancelled";

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

/** Working (Mon–Fri) days covered by an inclusive date range. */
export function workingDays(start: string, end: string): number {
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  let count = 0;
  for (const d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}
