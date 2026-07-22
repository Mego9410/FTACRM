import Link from "next/link";
import { requireRole } from "@/lib/auth";

const SECTIONS = [
  { label: "Reporting", href: "/reporting" },
  { label: "Users", href: "/admin/users" },
  { label: "Lookups", href: "/admin/lookups" },
  { label: "Checklists", href: "/admin/checklists" },
  { label: "Intro email blocks", href: "/admin/intro-blocks" },
  { label: "Permissions", href: "/admin/permissions" },
  { label: "Audit", href: "/admin/audit" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("admin");
  return (
    <div>
      <div className="mb-5">
        <h1 className="text-[26px] font-extrabold tracking-tight text-fg-1">Control Centre</h1>
        <p className="mt-0.5 text-sm text-fg-3">Reporting, users, configuration and taxonomy — changes apply firm-wide.</p>
      </div>
      <div className="flex flex-col gap-5 lg:flex-row">
        <nav className="flex shrink-0 flex-row gap-1 overflow-x-auto lg:w-48 lg:flex-col">
          {SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="whitespace-nowrap rounded-[10px] px-3 py-2 text-sm font-semibold text-fg-2 hover:bg-surface hover:text-fg-1"
            >
              {s.label}
            </Link>
          ))}
        </nav>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
