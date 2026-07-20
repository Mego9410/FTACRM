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
  { label: "Contacts", href: "/contacts", icon: UsersRound },
  { label: "Practices", href: "/practices", icon: Building2 },
  { label: "Deals", href: "/deals", icon: Handshake },
  { label: "Matching", href: "/matching", icon: Sparkles },
  { label: "Campaigns", href: "/campaigns", icon: Mail },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Reporting", href: "/reporting", icon: ChartNoAxesColumn },
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

  // Close the mobile sheet on navigation.
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/sign-in");
    router.refresh();
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 bg-ink text-white shadow-md">
      {/* Gold hairline — the brand's signature accent */}
      <div className="h-0.5 bg-gold" />
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-2 px-3 sm:gap-4 sm:px-6">
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          className="rounded-[10px] p-2 text-white/80 hover:bg-white/10 hover:text-white lg:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X size={20} /> : <MenuIcon size={20} />}
        </button>

        <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5">
          <Image src="/brand/logo.png" alt="" width={30} height={30} className="rounded-[8px]" />
          <span className="hidden flex-col leading-none min-[420px]:flex">
            <span className="font-serif text-[15px] font-semibold tracking-tight text-gold">
              Frank Taylor <span className="text-white/90">&amp;</span> Associates
            </span>
            <span className="mt-0.5 text-[9.5px] font-bold uppercase tracking-[0.22em] text-white/50">
              Practice sales CRM
            </span>
          </span>
        </Link>

        <nav className="ml-2 hidden min-w-0 flex-1 items-center gap-0.5 lg:flex">
          {NAV.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative whitespace-nowrap px-3 py-[17px] text-[13.5px] font-semibold transition-colors",
                  active ? "text-gold" : "text-white/70 hover:text-white",
                )}
              >
                {item.label}
                {active ? (
                  <span className="absolute inset-x-2.5 bottom-0 h-0.5 rounded-t-full bg-gold" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="rounded-[10px] p-2 text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Search (Ctrl+K)"
            title="Search (Ctrl+K)"
          >
            <Search size={18} />
          </button>

          <div className="hidden sm:block">
            <Menu
              trigger={
                <span className="inline-flex rounded-[10px] p-2 text-white/80 hover:bg-white/10 hover:text-white" title="Quick add">
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

          <NotificationsBell profileId={profile.id} dark />

          <Menu
            trigger={
              <span className="ml-1 inline-flex cursor-pointer items-center rounded-full ring-2 ring-white/20 transition hover:ring-gold/70">
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

      {/* Mobile sheet */}
      {mobileOpen ? (
        <nav className="border-t border-white/10 bg-ink-pure px-3 pb-4 pt-2 lg:hidden">
          <ul className="grid grid-cols-2 gap-1">
            {NAV.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-sm px-3.5 py-3 text-sm font-semibold",
                      active ? "bg-gold text-ink" : "text-white/80 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <Icon size={17} /> {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex gap-1.5 border-t border-white/10 pt-3">
            <Link href="/contacts/new" className="flex-1 rounded-sm bg-white/10 px-3 py-2.5 text-center text-[13px] font-semibold text-white hover:bg-white/15">
              New contact
            </Link>
            <Link href="/practices/new" className="flex-1 rounded-sm bg-white/10 px-3 py-2.5 text-center text-[13px] font-semibold text-white hover:bg-white/15">
              New practice
            </Link>
            <Link href="/tasks?new=1" className="flex-1 rounded-sm bg-white/10 px-3 py-2.5 text-center text-[13px] font-semibold text-white hover:bg-white/15">
              New task
            </Link>
          </div>
        </nav>
      ) : null}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
