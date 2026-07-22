"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  CalendarDays,
  Handshake,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu as MenuIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Rocket,
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
import { AspenMark, AspenWordmark } from "@/components/shell/brand";
import { InlineSearch } from "@/components/shell/inline-search";
import { NotificationsBell } from "@/components/shell/notifications-bell";
import { SidebarPanels } from "@/components/shell/sidebar-panels";
import type { SidebarData } from "@/lib/sidebar";

const NAV = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "My tasks", href: "/tasks", icon: ListTodo },
  { label: "Contacts", href: "/contacts", icon: UsersRound },
  { label: "Practices", href: "/practices", icon: Building2 },
  { label: "Sales progression", href: "/deals", icon: Handshake },
  { label: "Launches", href: "/launches", icon: Rocket },
];

function Wordmark() {
  return (
    <span className="flex min-w-0 flex-col leading-none">
      <AspenWordmark className="h-[26px] w-auto" />
      <span className="mt-1 truncate text-[9px] font-bold uppercase tracking-[0.16em] text-fg-4">
        Frank Taylor &amp; Associates
      </span>
    </span>
  );
}

export function AppNav({
  profile,
  sidebar,
  children,
}: {
  profile: SessionProfile;
  sidebar: SidebarData | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  // Default to collapsed; auto-collapse on smaller laptop widths (< 1280px).
  const [collapsed, setCollapsed] = React.useState(true);
  const prefRef = React.useRef(true);

  React.useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem("aspen-sidebar-collapsed");
    } catch {
      /* ignore */
    }
    prefRef.current = stored === null ? true : stored === "1";
    const apply = () => setCollapsed(window.innerWidth < 1280 ? true : prefRef.current);
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v;
      prefRef.current = next;
      try {
        window.localStorage.setItem("aspen-sidebar-collapsed", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/sign-in");
    router.refresh();
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const NavLinks = ({ onNavigate, mini = false }: { onNavigate?: () => void; mini?: boolean }) => (
    <>
      {NAV.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={mini ? item.label : undefined}
            aria-label={mini ? item.label : undefined}
            className={cn(
              "group relative flex items-center rounded-[10px] text-sm font-semibold transition-colors",
              mini ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5",
              active ? "bg-gold-tint text-gold-deep shadow-xs" : "text-fg-2 hover:bg-surface-2 hover:text-fg-1",
            )}
          >
            {active && !mini ? (
              <span className="absolute left-1 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-gold" />
            ) : null}
            <Icon size={18} className={cn("shrink-0", active ? "text-gold-deep" : "text-fg-3 group-hover:text-fg-1")} />
            {!mini ? <span className="truncate">{item.label}</span> : null}
          </Link>
        );
      })}
    </>
  );

  const railWidth = collapsed ? "lg:w-[70px]" : "lg:w-60";
  const contentPad = collapsed ? "lg:pl-[70px]" : "lg:pl-60";

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-line bg-surface transition-[width] duration-200 lg:flex",
          railWidth,
        )}
      >
        <div className={cn("flex h-14 shrink-0 items-center border-b border-line", collapsed ? "gap-0.5 px-1.5" : "px-3")}>
          <Link href="/dashboard" className={cn("flex min-w-0 items-center", collapsed ? "" : "flex-1 pl-1")}>
            {collapsed ? <AspenMark size={26} /> : <Wordmark />}
          </Link>
          <button
            type="button"
            onClick={toggleCollapsed}
            title={collapsed ? "Expand menu" : "Collapse menu"}
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
            className="shrink-0 rounded-[8px] p-1.5 text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg-1"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <nav className="flex flex-1 flex-col overflow-y-auto p-3">
          <div className="flex flex-col gap-0.5">
            {!collapsed ? (
              <p className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-fg-4">Menu</p>
            ) : null}
            <NavLinks mini={collapsed} />
          </div>
          {!collapsed && sidebar ? (
            <div className="mt-auto pt-4">
              <SidebarPanels data={sidebar} />
            </div>
          ) : null}
        </nav>
      </aside>

      {/* Top bar — search + right-hand icons only */}
      <header className={cn("sticky top-0 z-30 border-b border-line bg-surface transition-[padding] duration-200", contentPad)}>
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
            <AspenMark size={28} />
          </Link>

          <InlineSearch hotkey className="min-w-0 flex-1 sm:mx-1 lg:max-w-lg" />

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

      {/* Main content — reflows with the sidebar width */}
      <main className={cn("transition-[padding] duration-200", contentPad)}>
        <div className="mx-auto w-full max-w-[1400px] overflow-x-clip px-4 py-6 sm:px-6">{children}</div>
      </main>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[82%] flex-col overflow-y-auto bg-surface shadow-lg">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
              <Wordmark />
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
    </>
  );
}
