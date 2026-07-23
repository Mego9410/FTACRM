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

/**
 * [SEV-MED-02] Return a generic failure for an unexpected DB/driver error while
 * logging the real detail server-side. Prevents leaking table/column/constraint/
 * RLS-policy names to the client. Use for `catch`/`if (error)` paths that would
 * otherwise surface `error.message`.
 */
export function dbFail<T = undefined>(error: unknown, context?: string): ActionResult<T> {
  console.error(`[action]${context ? ` ${context}` : ""}`, error);
  return { ok: false, error: "Something went wrong. Please try again." };
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
