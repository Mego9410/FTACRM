/**
 * UK-centric phone number normalisation to E.164, for matching 3CX call
 * parties against contact records. Pure and unit-tested.
 */

/** Strip formatting noise; preserve a leading +. */
function digits(raw: string): string {
  const trimmed = raw.trim();
  const plus = trimmed.startsWith("+");
  const only = trimmed.replace(/\D/g, "");
  return plus ? `+${only}` : only;
}

/**
 * Normalise to E.164. UK default region:
 *   07911 123456     → +447911123456
 *   020 7946 0018    → +442079460018
 *   0044 20 7946 018 → +44207946018
 *   +44 (0)20 …      → +4420…
 * Non-UK international (+1…, 001…) passes through as +….
 * Returns null for anything too short to be a real number.
 */
export function normalisePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let n = digits(raw);
  if (!n) return null;

  if (n.startsWith("+")) {
    n = `+${n.slice(1).replace(/^44 ?0/, "44")}`; // +44(0)… → +44…
    if (n.startsWith("+440")) n = `+44${n.slice(4)}`;
    return n.length >= 9 ? n : null;
  }
  if (n.startsWith("00")) {
    const rest = n.slice(2);
    return rest.length >= 8 ? `+${rest.startsWith("440") ? `44${rest.slice(3)}` : rest}` : null;
  }
  if (n.startsWith("44")) {
    const rest = n.slice(2).replace(/^0/, "");
    return rest.length >= 7 ? `+44${rest}` : null;
  }
  if (n.startsWith("0")) {
    const rest = n.slice(1);
    return rest.length >= 7 ? `+44${rest}` : null;
  }
  // Bare national significant number (3CX sometimes strips the trunk 0).
  return n.length >= 9 ? `+44${n}` : null;
}

/** True when two raw numbers normalise to the same E.164 value. */
export function samePhone(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalisePhone(a);
  return na !== null && na === normalisePhone(b);
}

/** Looks like an internal 3CX extension (2-5 digits), not an external number. */
export function isInternalExtension(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const n = raw.replace(/\D/g, "");
  return n.length > 0 && n.length <= 5 && !raw.trim().startsWith("+");
}
