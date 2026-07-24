"use client";

import * as React from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Menu, MenuItem, MenuSeparator } from "@/components/ui/menu";
import { relativeTime } from "@/lib/utils";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  link_url: string | null;
  read_at: string | null;
  created_at: string;
};

export function NotificationsBell({ profileId, dark }: { profileId: string; dark?: boolean }) {
  const [items, setItems] = React.useState<Notification[]>([]);
  const supabase = React.useMemo(() => createClient(), []);

  const load = React.useCallback(async () => {
    const { data } = await supabase
      .from("notifications")
      .select("id, title, body, link_url, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(12);
    setItems((data as Notification[]) ?? []);
  }, [supabase]);

  React.useEffect(() => {
    void load();
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `profile_id=eq.${profileId}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, profileId, load]);

  const unread = items.filter((i) => !i.read_at).length;

  async function markAllRead() {
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .is("read_at", null);
    void load();
  }

  return (
    <Menu
      trigger={
        <span
          className={
            dark
              ? "relative inline-flex rounded-[10px] p-2 text-white/80 hover:bg-white/10 hover:text-white"
              : "relative inline-flex rounded-[10px] p-2 text-fg-2 hover:bg-surface-2 hover:text-fg-1"
          }
          title="Notifications"
        >
          <Bell size={18} />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-ink">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </span>
      }
      className="w-80"
    >
      <div className="flex items-center justify-between px-3.5 py-2">
        <p className="text-sm font-bold text-fg-1">Notifications</p>
        {unread > 0 ? (
          <button type="button" onClick={() => void markAllRead()} className="text-xs font-semibold text-gold-deep hover:underline">
            Mark all read
          </button>
        ) : null}
      </div>
      <MenuSeparator />
      {items.length === 0 ? (
        <p className="px-3.5 py-6 text-center text-sm text-fg-3">Nothing yet.</p>
      ) : (
        items.map((n) => (
          <Link
            key={n.id}
            href={n.link_url ?? "#"}
            className="block px-3.5 py-2.5 hover:bg-surface-2"
          >
            <span className="flex items-start gap-2">
              {!n.read_at ? <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" /> : <span className="mt-1.5 h-1.5 w-1.5 shrink-0" />}
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-fg-1">{n.title}</span>
                {n.body ? <span className="block truncate text-xs text-fg-3">{n.body}</span> : null}
                <span className="block text-[11px] text-fg-4">{relativeTime(n.created_at)}</span>
              </span>
            </span>
          </Link>
        ))
      )}
      <MenuSeparator />
      <MenuItem href="/notifications">View all notifications</MenuItem>
    </Menu>
  );
}
