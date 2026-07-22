import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shell/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { Avatar, Badge, Button, Card, EmptyState } from "@/components/ui/primitives";
import { contactName } from "@/lib/contact-helpers";
import { relativeTime } from "@/lib/utils";
import { resolveSort, applySort, type SortOptions } from "@/lib/sort";
import { SortHeader } from "@/components/ui/sortable";
import { ContactFilters } from "./contact-filters";

export const metadata = { title: "Contacts" };

const PAGE_SIZE = 50;

const SORT_OPTIONS: SortOptions = {
  name: [{ column: "last_name" }, { column: "first_name" }],
  contact: { column: "email", nullsFirst: false },
  temp: { column: "temperature", nullsFirst: false },
  last_contacted: { column: "last_contacted_at", nullsFirst: false },
  recent: { column: "created_at" },
};

type Search = {
  role?: string;
  q?: string;
  temperature?: string;
  stale?: string;
  page?: string;
  archived?: string;
  sort?: string;
  dir?: string;
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
  const [allCount, buyerCount, sellerCount, solicitorCount] = await Promise.all([
    countFor(),
    countFor("buyer"),
    countFor("seller"),
    countFor("solicitor"),
  ]);

  let query = supabase
    .from("contacts")
    .select(
      "id, first_name, last_name, company_name, email, phone, mobile, roles, status, temperature, last_contacted_at, created_at, do_not_contact",
      { count: "exact" },
    );

  if (params.archived === "1") query = query.not("archived_at", "is", null);
  else query = query.is("archived_at", null);
  if (params.role) query = query.contains("roles", [params.role]);
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

  const sort = resolveSort(params, SORT_OPTIONS, { key: "recent", dir: "desc" });
  const { data: contacts, count } = await applySort(query, sort).range(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE - 1,
  );

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
        eyebrow="Relationships" title="Contacts"
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

      <ContactFilters />

      <Card className="mt-4 overflow-x-auto">
        {(contacts ?? []).length === 0 ? (
          <EmptyState
            className="m-4"
            title="No contacts match"
            body={params.q ? "Try clearing filters." : "Add your first contact to get going."}
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
                <SortHeader label="Name" sortKey="name" currentSort={sort.key} currentDir={sort.dir} params={params} basePath="/contacts" className="px-4" />
                <th className="px-3 py-2.5">Roles</th>
                <SortHeader label="Contact" sortKey="contact" currentSort={sort.key} currentDir={sort.dir} params={params} basePath="/contacts" />
                <SortHeader label="Temp" sortKey="temp" currentSort={sort.key} currentDir={sort.dir} params={params} basePath="/contacts" />
                <SortHeader label="Last contacted" sortKey="last_contacted" currentSort={sort.key} currentDir={sort.dir} params={params} basePath="/contacts" />
              </tr>
            </thead>
            <tbody>
              {(contacts ?? []).map((c) => {
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
