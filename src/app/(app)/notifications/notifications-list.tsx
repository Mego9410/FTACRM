"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, EmptyState } from "@/components/ui/primitives";
import { relativeTime } from "@/lib/utils";

type Notification = {
  id: string;
  title: string;
  body: string | null;
  link_url: string | null;
  read_at: string | null;
  created_at: string;
};

export function NotificationsList({ initial }: { initial: Notification[] }) {
  const router = useRouter();
  const supabase = React.useMemo(() => createClient(), []);
  const [items, setItems] = React.useState<Notification[]>(initial);
  const unread = items.filter((i) => !i.read_at).length;

  async function markRead(id: string) {
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, read_at: new Date().toISOString() } : x)));
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  }

  async function markAll() {
    const now = new Date().toISOString();
    setItems((xs) => xs.map((x) => ({ ...x, read_at: x.read_at ?? now })));
    await supabase.from("notifications").update({ read_at: now }).is("read_at", null);
  }

  function open(n: Notification) {
    if (!n.read_at) void markRead(n.id);
    if (n.link_url && n.link_url !== "#") router.push(n.link_url);
  }

  if (items.length === 0) {
    return <EmptyState title="No notifications" body="Alerts about signatures, tasks, calls and more will appear here." />;
  }

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <p className="text-sm text-fg-3">{unread} unread</p>
        {unread > 0 ? (
          <button type="button" onClick={() => void markAll()} className="text-xs font-semibold text-gold-deep hover:underline">
            Mark all read
          </button>
        ) : null}
      </div>
      <ul className="divide-y divide-line">
        {items.map((n) => (
          <li key={n.id} className={n.read_at ? "" : "bg-gold-tint/30"}>
            <div className="flex items-start gap-3 px-5 py-3.5">
              <button
                type="button"
                onClick={() => open(n)}
                className="min-w-0 flex-1 text-left"
              >
                <span className="flex items-center gap-2">
                  {!n.read_at ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold" /> : null}
                  <span className="truncate text-sm font-semibold text-fg-1">{n.title}</span>
                </span>
                {n.body ? <span className="mt-0.5 block text-xs text-fg-3">{n.body}</span> : null}
                <span className="mt-0.5 block text-[11px] text-fg-4">{relativeTime(n.created_at)}</span>
              </button>
              {!n.read_at ? (
                <button
                  type="button"
                  onClick={() => void markRead(n.id)}
                  className="shrink-0 rounded-md p-1.5 text-fg-4 hover:bg-surface-2 hover:text-fg-1"
                  title="Mark read"
                  aria-label="Mark read"
                >
                  <Check size={15} />
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
