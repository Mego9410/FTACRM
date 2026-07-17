/** Uniform result envelope for server actions consumed by client forms. */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function ok<T>(data?: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail<T = undefined>(
  error: string,
  fieldErrors?: Record<string, string>,
): ActionResult<T> {
  return { ok: false, error, fieldErrors };
}

/** Zod-style flatten → per-field error map. */
export function zodFieldErrors(flat: {
  fieldErrors: Record<string, string[] | undefined>;
}): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(flat.fieldErrors)) {
    if (v && v.length > 0) out[k] = v[0]!;
  }
  return out;
}
