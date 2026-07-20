"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  CalendarDays,
  Handshake,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu as MenuIcon,
  Plus,
  Search,
  Settings,
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
];

function Wordmark({ size = 30 }: { size?: number }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Image src="/brand/logo.png" alt="" width={size} height={size} className="shrink-0 rounded-[8px]" />
      <span className="flex min-w-0 flex-col leading-none">
        <span className="truncate text-[15px] font-extrabold tracking-tight text-fg-1">
          Aspen<span className="text-gold-deep">.</span>
        </span>
        <span className="mt-0.5 truncate text-[9px] font-bold uppercase tracking-[0.16em] text-fg-4">
          Frank Taylor &amp; Associates
        </span>
      </span>
    </span>
  );
}

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

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {NAV.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-sm font-semibold transition-colors",
              active ? "bg-gold-tint text-gold-deep" : "text-fg-2 hover:bg-surface-2 hover:text-fg-1",
            )}
          >
            <Icon size={18} className="shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-surface lg:flex">
        <Link href="/dashboard" className="flex h-14 shrink-0 items-center border-b border-line px-5">
          <Wordmark />
        </Link>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
          <NavLinks />
        </nav>
      </aside>

      {/* Top bar — search + right-hand icons only */}
      <header className="sticky top-0 z-30 border-b border-line bg-surface lg:pl-60">
        <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center gap-2 px-3 sm:gap-3 sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="shrink-0 rounded-[10px] p-2 text-fg-2 hover:bg-surface-2 hover:text-fg-1 lg:hidden"
            aria-label="Open menu"
          >
            <MenuIcon size={20} />
          </button>

          <Link href="/dashboard" className="flex shrink-0 items-center lg:hidden">
            <Image src="/brand/logo.png" alt="Aspen" width={28} height={28} className="rounded-[7px]" />
          </Link>

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="group flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-line bg-surface-2 px-3.5 text-left transition-colors hover:border-gold/60 hover:bg-surface sm:mx-1 lg:max-w-lg"
            aria-label="Search (Ctrl+K)"
          >
            <Search size={17} className="shrink-0 text-fg-3 transition-colors group-hover:text-gold-deep" />
            <span className="flex-1 truncate text-sm text-fg-3">Find anything…</span>
            <kbd className="hidden shrink-0 rounded border border-line bg-surface px-1.5 py-0.5 text-[11px] font-semibold text-fg-4 sm:inline">
              ⌘K
            </kbd>
          </button>

          <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
            <Link
              href="/calendar"
              title="Calendar"
              aria-label="Calendar"
              className={cn(
                "inline-flex rounded-[10px] p-2 hover:bg-surface-2",
                isActive("/calendar") ? "bg-gold-tint text-gold-deep" : "text-fg-2 hover:text-fg-1",
              )}
            >
              <CalendarDays size={18} />
            </Link>

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
      </header>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[82%] flex-col overflow-y-auto bg-surface shadow-lg">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
              <Wordmark size={28} />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-[10px] p-2 text-fg-2 hover:bg-surface-2 hover:text-fg-1"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
              <NavLinks onNavigate={() => setMobileOpen(false)} />
            </nav>
            <div className="grid grid-cols-2 gap-1.5 border-t border-line p-3">
              <Link href="/contacts/new" onClick={() => setMobileOpen(false)} className="rounded-sm border border-line px-3 py-2.5 text-center text-[13px] font-semibold text-fg-1 hover:bg-surface-2">
                New contact
              </Link>
              <Link href="/practices/new" onClick={() => setMobileOpen(false)} className="rounded-sm border border-line px-3 py-2.5 text-center text-[13px] font-semibold text-fg-1 hover:bg-surface-2">
                New practice
              </Link>
              <Link href="/tasks?new=1" onClick={() => setMobileOpen(false)} className="rounded-sm border border-line px-3 py-2.5 text-center text-[13px] font-semibold text-fg-1 hover:bg-surface-2">
                New task
              </Link>
              <Link href="/calendar?new=1" onClick={() => setMobileOpen(false)} className="rounded-sm border border-line px-3 py-2.5 text-center text-[13px] font-semibold text-fg-1 hover:bg-surface-2">
                New event
              </Link>
            </div>
          </aside>
        </div>
      ) : null}

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
