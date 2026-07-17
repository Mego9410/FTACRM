"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  Calendar,
  ChartNoAxesColumn,
  Plus,
  Search,
  Settings,
  LogOut,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/primitives";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/menu";
import { GlobalSearch } from "@/components/shell/global-search";
import { NotificationsBell } from "@/components/shell/notifications-bell";

const NAV = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Contacts", href: "/contacts" },
  { label: "Practices", href: "/practices" },
  { label: "Deals", href: "/deals" },
  { label: "Matching", href: "/matching" },
  { label: "Campaigns", href: "/campaigns" },
  { label: "Calendar", href: "/calendar" },
  { label: "Reporting", href: "/reporting" },
];

export function AppNav({ profile }: { profile: SessionProfile }) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = React.useState(false);

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

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-4 sm:px-6">
        <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5">
          <Image src="/brand/logo.png" alt="" width={30} height={30} className="rounded-[8px]" />
          <span className="hidden text-[15px] font-extrabold tracking-tight text-fg-1 lg:block">
            FTA CRM
          </span>
        </Link>

        <nav className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-[10px] px-3 py-1.5 text-sm font-semibold transition-colors",
                  active ? "bg-gold-tint text-gold-deep" : "text-fg-2 hover:bg-surface-2 hover:text-fg-1",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="rounded-[10px] p-2 text-fg-2 hover:bg-surface-2 hover:text-fg-1"
            aria-label="Search (Ctrl+K)"
            title="Search (Ctrl+K)"
          >
            <Search size={18} />
          </button>

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

          <NotificationsBell profileId={profile.id} />

          <Menu
            trigger={
              <span className="ml-1 inline-flex cursor-pointer items-center">
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
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
