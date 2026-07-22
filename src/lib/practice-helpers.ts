export type PracticeLabelFields = {
  display_title?: string | null;
  name?: string | null;
  county?: string | null;
};

/**
 * How a practice is labelled throughout the product: its name followed by the
 * county it sits in, e.g. "Highcliffe Dental Practice, Dorset". Falls back to
 * just the name when no county is recorded.
 */
export function practiceLabel(p: PracticeLabelFields): string {
  const base = p.display_title?.trim() || p.name?.trim() || "Practice";
  const county = p.county?.trim();
  return county ? `${base}, ${county}` : base;
}
