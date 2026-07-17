import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/utils";

/** Per-record audit history (shared by contact / practice / deal records). */
export async function AuditTrail({ table, recordId }: { table: string; recordId: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_log")
    .select("id, field, old_value, new_value, changed_at, profiles!audit_log_changed_by_fkey(full_name)")
    .eq("table_name", table)
    .eq("record_id", recordId)
    .order("changed_at", { ascending: false })
    .limit(300);

  if (!data || data.length === 0) {
    return <EmptyState title="No changes recorded" body="Field-level changes to this record appear here." />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs font-bold uppercase tracking-wide text-fg-3">
            <th className="px-4 py-2.5">When</th>
            <th className="px-3 py-2.5">User</th>
            <th className="px-3 py-2.5">Field</th>
            <th className="px-3 py-2.5">Change</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const user = row.profiles as unknown as { full_name: string } | null;
            return (
              <tr key={row.id} className="border-b border-line last:border-0">
                <td className="whitespace-nowrap px-4 py-2 text-fg-3">{formatDateTime(row.changed_at)}</td>
                <td className="px-3 py-2">{user?.full_name ?? "System"}</td>
                <td className="px-3 py-2 font-semibold text-fg-1">{row.field.replace(/_/g, " ")}</td>
                <td className="px-3 py-2">
                  <span className="text-fg-3 line-through decoration-fg-4">{row.old_value ?? "—"}</span>
                  <span className="mx-1.5 text-fg-4">→</span>
                  <span className="font-medium text-fg-1">{row.new_value ?? "—"}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
