import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { Avatar, Badge, Button, Card, EmptyState } from "@/components/ui/primitives";
import { contactName } from "@/lib/contact-helpers";
import { relativeTime } from "@/lib/utils";
import { ContactFilters } from "./contact-filters";

export const metadata = { title: "Contacts" };

const PAGE_SIZE = 50;

type Search = {
  role?: string;
  q?: string;
  owner?: string;
  temperature?: string;
  stale?: string;
  page?: string;
  archived?: string;
};

export default async function ContactsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const supabase = await createClient();

  const countFor = async (role?: string) => {
    let q = supabase.from("contacts").select("id", { count: "exact", head: true }).is("archived_at", null);
    if (role) q = q.contains("roles", [role]);
    const { count } = await q;
    return count ?? 0;
  };
  const [allCount, buyerCount, sellerCount, solicitorCount, { data: owners }] = await Promise.all([
    countFor(),
    countFor("buyer"),
    countFor("seller"),
    countFor("solicitor"),
    supabase.from("profiles").select("id, full_name").eq("is_active", true).order("full_name"),
  ]);

  let query = supabase
    .from("contacts")
    .select(
      "id, first_name, last_name, company_name, email, phone, mobile, roles, status, temperature, owner_id, last_contacted_at, created_at, do_not_contact, profiles!contacts_owner_id_fkey(full_name)",
      { count: "exact" },
    );

  if (params.archived === "1") query = query.not("archived_at", "is", null);
  else query = query.is("archived_at", null);
  if (params.role) query = query.contains("roles", [params.role]);
  if (params.owner) query = query.eq("owner_id", params.owner);
  if (params.temperature) query = query.eq("temperature", params.temperature);
  if (params.stale) {
    const days = Number(params.stale) || 90;
    query = query.or(
      `last_contacted_at.is.null,last_contacted_at.lt.${new Date(Date.now() - days * 86_400_000).toISOString()}`,
    );
  }
  if (params.q) {
    const like = `%${params.q.replace(/[%_]/g, "")}%`;
    query = query.or(
      `first_name.ilike.${like},last_name.ilike.${like},company_name.ilike.${like},email.ilike.${like},phone.ilike.${like},mobile.ilike.${like},ref.ilike.${like}`,
    );
  }

  const { data: contacts, count } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const qs = (extra: Record<string, string | undefined>) => {
    const merged = { ...params, ...extra };
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) sp.set(k, v);
    const s = sp.toString();
    return s ? `?${s}` : "";
  };

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Contacts"
        subtitle="Buyers, sellers, solicitors and everyone in between"
        actions={
          <Link href="/contacts/new">
            <Button>New contact</Button>
          </Link>
        }
      />

      <LinkTabs
        className="mb-4"
        tabs={[
          { label: "All", href: "/contacts", count: allCount, exact: true },
          { label: "Buyers", href: "/contacts?role=buyer", count: buyerCount },
          { label: "Sellers", href: "/contacts?role=seller", count: sellerCount },
          { label: "Solicitors", href: "/contacts?role=solicitor", count: solicitorCount },
        ]}
      />

      <ContactFilters owners={owners ?? []} />

      <Card className="mt-4 overflow-x-auto">
        {(contacts ?? []).length === 0 ? (
          <EmptyState
            className="m-4"
            title="No contacts match"
            body={params.q || params.owner ? "Try clearing filters." : "Add your first contact to get going."}
            action={
              <Link href="/contacts/new">
                <Button size="sm">New contact</Button>
              </Link>
            }
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-bold uppercase tracking-wide text-fg-3">
                <th className="px-4 py-2.5">Name</th>
                <th className="px-3 py-2.5">Roles</th>
                <th className="px-3 py-2.5">Contact</th>
                <th className="px-3 py-2.5">Temp</th>
                <th className="px-3 py-2.5">Owner</th>
                <th className="px-3 py-2.5">Last contacted</th>
              </tr>
            </thead>
            <tbody>
              {(contacts ?? []).map((c) => {
                const owner = c.profiles as unknown as { full_name: string } | null;
                return (
                  <tr key={c.id} className="border-b border-line last:border-0 hover:bg-surface-2/60">
                    <td className="px-4 py-2.5">
                      <Link href={`/contacts/${c.id}`} className="flex items-center gap-2.5">
                        <Avatar name={contactName(c)} size={28} />
                        <span className="font-semibold text-fg-1 hover:underline">{contactName(c)}</span>
                        {c.do_not_contact ? <Badge tone="danger">DNC</Badge> : null}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="flex flex-wrap gap-1">
                        {(c.roles as string[]).map((r) => (
                          <Badge key={r} className="capitalize">{r}</Badge>
                        ))}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-fg-2">
                      {[c.email, c.mobile ?? c.phone].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      {c.temperature ? (
                        <Badge tone={c.temperature === "hot" ? "danger" : c.temperature === "warm" ? "gold" : "nhs"} className="capitalize">
                          {c.temperature}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2.5">{owner?.full_name ?? "—"}</td>
                    <td className="px-3 py-2.5 text-fg-3">
                      {c.last_contacted_at ? relativeTime(c.last_contacted_at) : "Never"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-line px-4 py-3">
            <p className="text-xs text-fg-3">
              {count} contacts · page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link href={`/contacts${qs({ page: String(page - 1) })}`}>
                  <Button variant="outline" size="sm">Previous</Button>
                </Link>
              ) : null}
              {page < totalPages ? (
                <Link href={`/contacts${qs({ page: String(page + 1) })}`}>
                  <Button variant="outline" size="sm">Next</Button>
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
