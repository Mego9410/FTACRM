"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  ListTodo,
  Sparkles,
  TrendingUp,
  UsersRound,
  Wallet,
} from "lucide-react";
import type { DashboardData } from "@/lib/dashboard";
import { cn, formatGBP, relativeTime } from "@/lib/utils";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { setTaskStatus } from "@/app/(app)/tasks/actions";

/* ── Shared widget frame ────────────────────────────────────────────── */

function fmtTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

/* ── Key numbers (stat tiles with a progress ring) ──────────────────── */

function Ring({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <svg width={40} height={40} viewBox="0 0 40 40" className="shrink-0">
      <circle cx={20} cy={20} r={r} fill="none" stroke="var(--color-line)" strokeWidth={4} />
      <circle
        cx={20}
        cy={20}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        transform="rotate(-90 20 20)"
      />
    </svg>
  );
}

export function StatsWidget({ data }: { data: DashboardData }) {
  const s = data.stats;
  const tiles = [
    { label: "Open tasks", value: s.openTasks, sub: `${s.overdueTasks} overdue`, icon: ListTodo, ring: [s.openTasks - s.overdueTasks, Math.max(1, s.openTasks)], color: "#B4862A", href: "/tasks" },
    { label: "My live deals", value: s.myLiveDeals, sub: formatGBP(s.myPipelineValue, { compact: true }), icon: TrendingUp, ring: [s.myLiveDeals, Math.max(1, s.myLiveDeals)], color: "#2F77BE", href: "/deals" },
    { label: "Valuations this week", value: s.valuationsThisWeek, sub: "booked", icon: CalendarClock, ring: [s.valuationsThisWeek, Math.max(5, s.valuationsThisWeek)], color: "#A23B9E", href: "/practices?status=valuation" },
    { label: "Completions this month", value: s.completionsThisMonth, sub: "so far", icon: CheckCircle2, ring: [s.completionsThisMonth, Math.max(5, s.completionsThisMonth)], color: "#1F9D4D", href: "/deals?status=completed" },
    { label: "Practices available", value: s.availablePractices, sub: "on the market", icon: Building2, ring: [s.availablePractices, Math.max(1, s.availablePractices)], color: "#B4862A", href: "/practices?status=live" },
    { label: "Buyer pool", value: s.buyerPool.toLocaleString("en-GB"), sub: "registered", icon: UsersRound, ring: [1, 1], color: "#0E7490", href: "/contacts?role=buyer" },
  ];
  return (
    <div className="flex h-full items-stretch gap-3 overflow-x-auto p-4">
      {tiles.map((t) => {
        const Icon = t.icon;
        return (
          <Link
            key={t.label}
            href={t.href}
            className="flex min-w-[158px] flex-1 items-center gap-3 rounded-md border border-line bg-surface px-4 py-3.5 transition-shadow hover:shadow-sm"
          >
            <div className="relative flex items-center justify-center">
              <Ring value={t.ring[0]!} max={t.ring[1]!} color={t.color} />
              <Icon size={15} className="absolute" style={{ color: t.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-[22px] font-extrabold leading-none text-fg-1">{t.value}</p>
              <p className="mt-0.5 truncate text-[11px] font-semibold text-fg-3">{t.label}</p>
              <p className="truncate text-[11px] text-fg-4">{t.sub}</p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

/* ── Today timeline ─────────────────────────────────────────────────── */

export function TodayWidget({ data }: { data: DashboardData }) {
  const events = data.todayEvents;
  if (events.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState className="border-0 bg-transparent" title="No events today" body="Your day is clear." />
      </div>
    );
  }
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  return (
    <div className="h-full overflow-y-auto px-4 py-3">
      <ol className="relative ml-2 border-l border-line">
        {events.map((e) => {
          const start = new Date(e.startsAt);
          const startMin = start.getHours() * 60 + start.getMinutes();
          const past = !e.allDay && startMin < nowMin;
          return (
            <li key={e.id} className="relative mb-3 pl-4 last:mb-0">
              <span
                className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-surface"
                style={{ backgroundColor: e.color }}
              />
              <Link
                href={e.practiceId ? `/practices/${e.practiceId}` : "/calendar"}
                className={cn(
                  "block rounded-sm border border-line bg-surface px-3 py-2 transition-shadow hover:shadow-sm",
                  past && "opacity-55",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-fg-1">{e.title}</p>
                  <span className="shrink-0 text-xs font-semibold text-fg-3">
                    {e.allDay ? "All day" : `${fmtTime(e.startsAt)}`}
                  </span>
                </div>
                {e.location ? <p className="truncate text-xs text-fg-3">{e.location}</p> : null}
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ── Tasks ──────────────────────────────────────────────────────────── */

export function TasksWidget({ data }: { data: DashboardData }) {
  const router = useRouter();
  const { overdue, today, upcoming } = data.tasks;
  const groups = [
    { key: "overdue", label: "Overdue", items: overdue, tone: "danger" as const },
    { key: "today", label: "Due today", items: today, tone: "gold" as const },
    { key: "upcoming", label: "Upcoming", items: upcoming, tone: "neutral" as const },
  ].filter((g) => g.items.length > 0);

  if (groups.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState className="border-0 bg-transparent" title="No open tasks" body="You're all caught up." />
      </div>
    );
  }

  return (
    <div className="h-full space-y-3 overflow-y-auto p-4">
      {groups.map((g) => (
        <div key={g.key}>
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-fg-3">
            {g.label}
            <Badge tone={g.tone === "neutral" ? "neutral" : g.tone}>{g.items.length}</Badge>
          </p>
          <ul className="space-y-1.5">
            {g.items.map((t) => (
              <li key={t.id} className="flex items-center gap-2.5 rounded-sm border border-line bg-surface px-3 py-2">
                <button
                  type="button"
                  className="shrink-0 text-fg-4 hover:text-available-fg"
                  title="Mark done"
                  onClick={async () => {
                    await setTaskStatus({ id: t.id, status: "done" });
                    router.refresh();
                  }}
                >
                  <CheckCircle2 size={17} />
                </button>
                <div className="min-w-0 flex-1">
                  <Link
                    href={t.href ?? "/tasks"}
                    className="block truncate text-sm font-semibold text-fg-1 hover:text-gold-deep hover:underline"
                  >
                    {t.title}
                  </Link>
                  {t.linked ? (
                    <Link href={t.href ?? "/tasks"} className="truncate text-xs text-gold-deep hover:underline">
                      {t.linked}
                    </Link>
                  ) : null}
                </div>
                {t.dueAt ? (
                  <span className={cn("shrink-0 text-xs font-semibold", g.tone === "danger" ? "text-danger" : "text-fg-3")}>
                    {new Date(t.dueAt) < new Date() ? relativeTime(t.dueAt) : fmtTime(t.dueAt)}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* ── Needs attention ────────────────────────────────────────────────── */

export function AttentionWidget({ data }: { data: DashboardData }) {
  if (data.attention.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState className="border-0 bg-transparent" title="Nothing flagged" body="No stalled deals or expiring contracts." />
      </div>
    );
  }
  const dot = { danger: "bg-danger", warn: "bg-warn", gold: "bg-gold" } as const;
  return (
    <ul className="h-full space-y-1.5 overflow-y-auto p-4">
      {data.attention.map((a, i) => (
        <li key={i}>
          <Link href={a.href} className="flex items-start gap-2.5 rounded-sm border border-line bg-surface px-3 py-2 hover:shadow-sm">
            <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", dot[a.tone])} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-fg-1">{a.label}</p>
              <p className="truncate text-xs text-fg-3">{a.sublabel}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* ── Pipeline (my deals with mini trackers) ─────────────────────────── */

export function PipelineWidget({ data }: { data: DashboardData }) {
  if (data.pipeline.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState className="border-0 bg-transparent" title="No deals in progress" body="Deals you own appear here." />
      </div>
    );
  }
  return (
    <ul className="h-full space-y-2 overflow-y-auto p-4">
      {data.pipeline.map((d) => (
        <li key={d.id}>
          <Link href={`/deals/${d.id}`} className="block rounded-sm border border-line bg-surface px-3 py-2.5 hover:shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold text-fg-1">{d.title}</p>
              <span className="shrink-0 text-xs font-bold text-gold-deep">{formatGBP(d.agreedPrice, { compact: true })}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-1">
              {Array.from({ length: d.totalStages }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 flex-1 rounded-full",
                    i < d.stageIndex ? "bg-available-fg" : i === d.stageIndex ? "bg-gold" : "bg-line",
                  )}
                />
              ))}
            </div>
            <p className="mt-1 flex items-center justify-between text-[11px] text-fg-3">
              <span>{d.stageLabel}</span>
              <span className="flex items-center gap-1">
                <Clock size={10} /> {relativeTime(d.lastActivityAt)}
              </span>
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* ── Recent activity ────────────────────────────────────────────────── */

export function ActivityWidget({ data }: { data: DashboardData }) {
  if (data.activity.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <EmptyState className="border-0 bg-transparent" title="No activity yet" body="Calls, notes and updates show here." />
      </div>
    );
  }
  return (
    <ul className="h-full space-y-2.5 overflow-y-auto p-4">
      {data.activity.map((a) => (
        <li key={a.id} className="flex items-start gap-2.5">
          <span
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: a.color ?? "#8C8C88" }}
          >
            {a.author.split(" ").map((p) => p[0]).slice(0, 2).join("")}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs">
              <span className="font-bold text-fg-1">{a.author}</span>{" "}
              <span className="capitalize text-fg-4">{a.type}</span>
              {a.label ? (
                <>
                  {" · "}
                  <Link href={a.href} className="font-semibold text-gold-deep hover:underline">
                    {a.label}
                  </Link>
                </>
              ) : null}
              <span className="text-fg-4"> · {relativeTime(a.occurredAt)}</span>
            </p>
            {a.body ? <p className="line-clamp-2 text-xs text-fg-2">{a.body}</p> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ── AI suggestions (client, self-contained) ────────────────────────── */

export { AiWidget } from "./ai-widget";

/* Icon export for the picker */
export const WIDGET_ICONS = {
  stats: TrendingUp,
  today: CalendarClock,
  tasks: ListTodo,
  attention: Clock,
  pipeline: Wallet,
  activity: Sparkles,
  ai: Sparkles,
} as const;
