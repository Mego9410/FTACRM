"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { SidebarData } from "@/lib/sidebar";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const PANEL_HEIGHT_KEY = "aspen-sidebar-panel-h";
const MIN_PANEL_H = 160;
const MAX_PANEL_H = 620;

function fmtDue(iso: string): string {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return new Intl.DateTimeFormat("en-GB", sameDay ? { hour: "2-digit", minute: "2-digit" } : { day: "2-digit", month: "2-digit" }).format(d);
}

export function SidebarPanels({ data }: { data: SidebarData }) {
  const { tasks, eventDays, year, month, today } = data;
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Monday-start
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const eventSet = new Set(eventDays);
  const monthLabel = first.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const now = new Date();

  // User-adjustable height for the task/calendar box. Null = natural height
  // (default); once dragged, the box gets a fixed height and scrolls inside.
  const [height, setHeight] = React.useState<number | null>(null);
  const heightRef = React.useRef<number | null>(null);
  const bodyRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(PANEL_HEIGHT_KEY);
      if (stored) {
        const n = Number(stored);
        if (Number.isFinite(n)) {
          const clamped = Math.min(Math.max(n, MIN_PANEL_H), MAX_PANEL_H);
          heightRef.current = clamped;
          setHeight(clamped);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  function startResize(e: React.PointerEvent) {
    e.preventDefault();
    const startY = e.clientY;
    const startH = bodyRef.current?.offsetHeight ?? MIN_PANEL_H;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "ns-resize";
    function onMove(ev: PointerEvent) {
      // Drag the handle up (smaller clientY) to grow the box.
      const next = Math.min(Math.max(startH + (startY - ev.clientY), MIN_PANEL_H), MAX_PANEL_H);
      heightRef.current = next;
      setHeight(next);
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      try {
        if (heightRef.current != null) window.localStorage.setItem(PANEL_HEIGHT_KEY, String(heightRef.current));
      } catch {
        /* ignore */
      }
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div className="border-t border-line">
      {/* Drag handle — resize the task/calendar box vertically */}
      <div
        onPointerDown={startResize}
        onDoubleClick={() => {
          heightRef.current = null;
          setHeight(null);
          try {
            window.localStorage.removeItem(PANEL_HEIGHT_KEY);
          } catch {
            /* ignore */
          }
        }}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize task and calendar panel"
        title="Drag to resize · double-click to reset"
        className="group flex h-3.5 cursor-ns-resize touch-none items-center justify-center"
      >
        <span className="h-1 w-8 rounded-full bg-line transition-colors group-hover:bg-fg-4" />
      </div>
      <div
        ref={bodyRef}
        className="space-y-4 overflow-y-auto pb-4"
        style={height != null ? { height } : undefined}
      >
      {/* Mini task list */}
      <div>
        <div className="mb-1 flex items-center justify-between px-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-fg-4">My tasks</p>
          <Link href="/tasks" className="text-[11px] font-semibold text-gold-deep hover:underline">
            All
          </Link>
        </div>
        {tasks.length === 0 ? (
          <p className="px-1 py-1 text-xs text-fg-3">You&apos;re all caught up.</p>
        ) : (
          <ul className="space-y-0.5">
            {tasks.map((t) => {
              const overdue = t.dueAt && new Date(t.dueAt) < now;
              return (
                <li key={t.id}>
                  <Link href={`/tasks?task=${t.id}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface-2">
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", overdue ? "bg-danger" : "bg-gold")} />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-fg-1">{t.title}</span>
                    {t.dueAt ? (
                      <span className={cn("shrink-0 text-[10px] font-semibold", overdue ? "text-danger" : "text-fg-4")}>
                        {fmtDue(t.dueAt)}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Mini calendar */}
      <div>
        <div className="mb-1.5 flex items-center justify-between px-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-fg-4">{monthLabel}</p>
          <Link href="/calendar" className="text-[11px] font-semibold text-gold-deep hover:underline">
            Open
          </Link>
        </div>
        <div className="grid grid-cols-7 gap-y-0.5 px-1">
          {WEEKDAYS.map((d, i) => (
            <span key={i} className="pb-0.5 text-center text-[9px] font-bold text-fg-4">
              {d}
            </span>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <span key={i} />;
            const isToday = day === today;
            const hasEvent = eventSet.has(day);
            return (
              <Link key={i} href="/calendar" className="flex flex-col items-center" title={hasEvent ? `${day} — has events` : undefined}>
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold transition-colors",
                    isToday ? "bg-gold text-ink" : "text-fg-2 hover:bg-surface-2",
                  )}
                >
                  {day}
                </span>
                <span className={cn("mt-[1px] h-1 w-1 rounded-full", hasEvent && !isToday ? "bg-gold-deep" : "bg-transparent")} />
              </Link>
            );
          })}
        </div>
      </div>
      </div>
    </div>
  );
}
