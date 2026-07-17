import { createAdminClient } from "@/lib/supabase/admin";

export type AuditChange = {
  field: string;
  oldValue: unknown;
  newValue: unknown;
};

function toText(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

/** Write field-level audit entries. Call from server actions after a successful mutation. */
export async function audit(
  tableName: string,
  recordId: string,
  changedBy: string | null,
  changes: AuditChange[],
) {
  const rows = changes
    .map((c) => ({
      table_name: tableName,
      record_id: recordId,
      field: c.field,
      old_value: toText(c.oldValue),
      new_value: toText(c.newValue),
      changed_by: changedBy,
    }))
    .filter((r) => r.old_value !== r.new_value);
  if (rows.length === 0) return;
  const admin = createAdminClient();
  await admin.from("audit_log").insert(rows);
}

/** Diff two flat records over the given fields into audit changes. */
export function diffChanges<T extends Record<string, unknown>>(
  before: T | null,
  after: Partial<T>,
  fields?: string[],
): AuditChange[] {
  const keys = fields ?? Object.keys(after);
  return keys
    .filter((k) => !["updated_at", "created_at", "id"].includes(k))
    .map((k) => ({ field: k, oldValue: before?.[k], newValue: after[k] }))
    .filter((c) => c.newValue !== undefined);
}
