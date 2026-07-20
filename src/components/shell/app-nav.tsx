"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  CalendarDays,
  ChartNoAxesColumn,
  Handshake,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Mail,
  Menu as MenuIcon,
  Plus,
  Search,
  Settings,
  Sparkles,
  User,
  UsersRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/primitives";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/menu";
import { GlobalSearch } from "@/components/shell/global-search";
import { NotificationsBell } from "@/components/shell/notifications-bell";

const NAV = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My tasks", href: "/tasks", icon: ListTodo },
  { label: "Contacts", href: "/contacts", icon: UsersRound },
  { label: "Practices", href: "/practices", icon: Building2 },
  { label: "Deals", href: "/deals", icon: Handshake },
  { label: "Matching", href: "/matching", icon: Sparkles },
  { label: "Campaigns", href: "/campaigns", icon: Mail },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Reporting", href: "/reporting", icon: ChartNoAxesColumn, managerOnly: true },
];

export function AppNav({ profile }: { profile: SessionProfile }) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/sign-in");
    router.refresh();
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const nav = NAV.filter((item) => !item.managerOnly || profile.role !== "agent");

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="mx-auto w-full max-w-[1400px] px-3 sm:px-6">
        <div className="flex h-14 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="shrink-0 rounded-[10px] p-2 text-fg-2 hover:bg-surface-2 hover:text-fg-1 lg:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X size={20} /> : <MenuIcon size={20} />}
          </button>

          <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5">
            <Image src="/brand/logo.png" alt="" width={30} height={30} className="shrink-0 rounded-[8px]" />
            <span className="hidden min-w-0 flex-col leading-none xl:flex">
              <span className="truncate text-[15px] font-extrabold tracking-tight text-fg-1">
                Vantage<span className="text-gold-deep">.</span>
              </span>
              <span className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-[0.16em] text-fg-4">
                Frank Taylor &amp; Associates
              </span>
            </span>
          </Link>

          {/* Always-available search — front and centre. Opens the command palette. */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="group flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-line bg-surface-2 px-3.5 text-left transition-colors hover:border-gold/60 hover:bg-surface sm:mx-2 lg:max-w-lg"
            aria-label="Search (Ctrl+K)"
          >
            <Search size={17} className="shrink-0 text-fg-3 transition-colors group-hover:text-gold-deep" />
            <span className="flex-1 truncate text-sm text-fg-3">Find anything…</span>
            <kbd className="hidden shrink-0 rounded border border-line bg-surface px-1.5 py-0.5 text-[11px] font-semibold text-fg-4 sm:inline">
              ⌘K
            </kbd>
          </button>

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <div className="hidden sm:block">
              <Menu
                trigger={
                  <span className="inline-flex rounded-[10px] p-2 text-fg-2 hover:bg-surface-2 hover:text-fg-1" title="Quick add">
                    <Plus size={18} />
                  </span>
                }
              >
                <MenuItem href="/contacts/new">New contact</MenuItem>
                <MenuItem href="/practices/new">New practice</MenuItem>
                <MenuItem href="/tasks?new=1">New task</MenuItem>
                <MenuItem href="/calendar?new=1">New event</MenuItem>
              </Menu>
            </div>

            <NotificationsBell profileId={profile.id} />

            <Menu
              trigger={
                <span className="ml-1 inline-flex cursor-pointer items-center rounded-full ring-2 ring-line transition hover:ring-gold">
                  <Avatar name={profile.full_name} size={30} color={profile.calendar_color} />
                </span>
              }
            >
              <div className="border-b border-line px-3.5 py-2.5">
                <p className="text-sm font-bold text-fg-1">{profile.full_name}</p>
                <p className="text-xs text-fg-3">{profile.email}</p>
              </div>
              <MenuItem href="/settings">
                <User size={15} /> My settings
              </MenuItem>
              {profile.role === "admin" ? (
                <MenuItem href="/admin">
                  <Settings size={15} /> Control Centre
                </MenuItem>
              ) : null}
              <MenuSeparator />
              <MenuItem onClick={() => void signOut()} danger>
                <LogOut size={15} /> Sign out
              </MenuItem>
            </Menu>
          </div>
        </div>

        {/* Nav tabs row */}
        <nav className="-mt-px hidden min-w-0 items-center gap-0.5 overflow-x-auto border-t border-line/60 lg:flex">
          {nav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative whitespace-nowrap px-3 py-2.5 text-[13.5px] font-semibold transition-colors",
                  active ? "text-fg-1" : "text-fg-3 hover:text-fg-1",
                )}
              >
                {item.label}
                {active ? <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-t-full bg-gold" /> : null}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Mobile sheet */}
      {mobileOpen ? (
        <nav className="border-t border-line bg-surface px-3 pb-4 pt-2 shadow-md lg:hidden">
          <ul className="grid grid-cols-2 gap-1">
            {nav.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-sm px-3.5 py-3 text-sm font-semibold",
                      active ? "bg-gold-tint text-gold-deep" : "text-fg-2 hover:bg-surface-2 hover:text-fg-1",
                    )}
                  >
                    <Icon size={17} /> {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex gap-1.5 border-t border-line pt-3">
            <Link href="/contacts/new" className="flex-1 rounded-sm border border-line px-3 py-2.5 text-center text-[13px] font-semibold text-fg-1 hover:bg-surface-2">
              New contact
            </Link>
            <Link href="/practices/new" className="flex-1 rounded-sm border border-line px-3 py-2.5 text-center text-[13px] font-semibold text-fg-1 hover:bg-surface-2">
              New practice
            </Link>
            <Link href="/tasks?new=1" className="flex-1 rounded-sm border border-line px-3 py-2.5 text-center text-[13px] font-semibold text-fg-1 hover:bg-surface-2">
              New task
            </Link>
          </div>
        </nav>
      ) : null}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
