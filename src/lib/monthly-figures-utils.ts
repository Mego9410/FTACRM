// Pure helpers for the monthly figures report (client/server/test-safe).

export type FigureRow = { label: string; value: number; money?: number };
export type FigureSection = { title: string; rows: FigureRow[] };
export type MonthlyFigures = { month: string; label: string; sections: FigureSection[] };

/** First day of `month` (YYYY-MM) and the first day of the following month. */
export function monthBounds(month: string): { fromDate: string; toDate: string; label: string } {
  const [y, m] = month.split("-").map(Number);
  const from = new Date(Date.UTC(y, m - 1, 1));
  const to = new Date(Date.UTC(y, m, 1));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const label = from.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  return { fromDate: iso(from), toDate: iso(to), label };
}
