export type PracticeLabelFields = {
  display_title?: string | null;
  name?: string | null;
  county?: string | null;
};

/**
 * How a practice is labelled throughout the product: its trading name followed
 * by the county it sits in, e.g. "Oxford Family Dental, Oxfordshire". Falls back
 * to the marketing title when no trading name is set, and drops the county when
 * none is recorded.
 */
export function practiceLabel(p: PracticeLabelFields): string {
  const base = p.name?.trim() || p.display_title?.trim() || "Practice";
  const county = p.county?.trim();
  return county ? `${base}, ${county}` : base;
}
