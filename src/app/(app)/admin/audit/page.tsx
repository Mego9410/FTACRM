import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/primitives";

export const metadata = { title: "Audit" };

const PAGE_SIZE = 50;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; table?: string; user?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const supabase = await createClient();

  let query = supabase
    .from("audit_log")
    .select("id, table_name, record_id, field, old_value, new_value, changed_at, profiles!audit_log_changed_by_fkey(full_name)", { count: "exact" })
    .order("changed_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (params.table) query = query.eq("table_name", params.table);

  const { data, count } = await query;
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <Card>
      <CardHeader title={`Audit log (${count ?? 0} entries)`} />
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs font-bold uppercase tracking-wide text-fg-3">
            <th className="px-5 py-2.5">When</th>
            <th className="px-3 py-2.5">User</th>
            <th className="px-3 py-2.5">Record</th>
            <th className="px-3 py-2.5">Field</th>
            <th className="px-3 py-2.5">Change</th>
          </tr>
        </thead>
        <tbody>
          {(data ?? []).map((row) => {
            const user = row.profiles as unknown as { full_name: string } | null;
            return (
              <tr key={row.id} className="border-b border-line last:border-0">
                <td className="whitespace-nowrap px-5 py-2">{formatDateTime(row.changed_at)}</td>
                <td className="px-3 py-2">{user?.full_name ?? "System"}</td>
                <td className="px-3 py-2 text-xs text-fg-3">{row.table_name}</td>
                <td className="px-3 py-2 font-semibold text-fg-1">{row.field}</td>
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
      {totalPages > 1 ? (
        <div className="flex items-center justify-between px-5 py-3">
          <p className="text-xs text-fg-3">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link href={`/admin/audit?page=${page - 1}`}><Button variant="outline" size="sm">Previous</Button></Link>
            ) : null}
            {page < totalPages ? (
              <Link href={`/admin/audit?page=${page + 1}`}><Button variant="outline" size="sm">Next</Button></Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </Card>
  );
}
