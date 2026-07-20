/**
 * Server-side sorting helpers for paginated Supabase list pages.
 *
 * A page declares an allowlist of sortable keys → the DB column(s) each maps
 * to (never feed a raw searchParam into `.order()` — it's an injection point).
 * `resolveSort` validates the incoming `sort`/`dir` params against that list
 * and falls back to a page default; `applySort` threads the result into a
 * Supabase query builder.
 */

export type OrderClause = { column: string; nullsFirst?: boolean };
export type SortOptions = Record<string, OrderClause | OrderClause[]>;

export type ResolvedSort = {
  key: string;
  dir: "asc" | "desc";
  ascending: boolean;
  clauses: OrderClause[];
};

export function resolveSort(
  params: { sort?: string; dir?: string },
  options: SortOptions,
  fallback: { key: string; dir: "asc" | "desc" },
): ResolvedSort {
  const key = params.sort && params.sort in options ? params.sort : fallback.key;
  const dir: "asc" | "desc" = params.dir === "asc" || params.dir === "desc" ? params.dir : fallback.dir;
  const raw = options[key] ?? [];
  const clauses = Array.isArray(raw) ? raw : [raw];
  return { key, dir, ascending: dir === "asc", clauses };
}

/** Apply the resolved order clauses to any Supabase query builder, preserving its type. */
export function applySort<Q>(query: Q, sort: ResolvedSort): Q {
  type Orderable = { order: (c: string, o?: { ascending?: boolean; nullsFirst?: boolean }) => unknown };
  let out: unknown = query;
  for (const c of sort.clauses) {
    out = (out as Orderable).order(c.column, { ascending: sort.ascending, nullsFirst: c.nullsFirst });
  }
  return out as Q;
}
