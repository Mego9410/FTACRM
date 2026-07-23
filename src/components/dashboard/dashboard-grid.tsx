"use client";

import * as React from "react";
import { Responsive, WidthProvider, type Layout, type Layouts } from "react-grid-layout";
import {
  Activity,
  AlertTriangle,
  CalendarClock,
  GripVertical,
  LayoutGrid,
  ListTodo,
  Plus,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import type { DashboardData } from "@/lib/dashboard";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/primitives";
import { Menu, MenuItem } from "@/components/ui/menu";
import {
  ActivityWidget,
  AttentionWidget,
  PipelineWidget,
  StatsWidget,
  TasksWidget,
  TodayWidget,
} from "./widgets";
import { AiWidget, type AiWidgetRow } from "./ai-widget";
import { saveDashboardLayout, resetDashboardLayout } from "@/app/(app)/dashboard/actions";

type WidgetId = "stats" | "today" | "tasks" | "ai" | "pipeline" | "activity" | "attention";

type WidgetDef = {
  title: string;
  minW: number;
  minH: number;
  accent: string;
  icon: LucideIcon;
  lg: { w: number; h: number };
  render: (ctx: { data: DashboardData; ai: AiWidgetRow[] }) => React.ReactNode;
};

const REGISTRY: Record<WidgetId, WidgetDef> = {
  stats: { title: "Key numbers", minW: 4, minH: 3, accent: "#B4862A", icon: TrendingUp, lg: { w: 12, h: 3 }, render: ({ data }) => <StatsWidget data={data} /> },
  today: { title: "Today's schedule", minW: 3, minH: 3, accent: "#2F77BE", icon: CalendarClock, lg: { w: 4, h: 5 }, render: ({ data }) => <TodayWidget data={data} /> },
  tasks: { title: "My tasks", minW: 3, minH: 3, accent: "#1F9D4D", icon: ListTodo, lg: { w: 4, h: 5 }, render: ({ data }) => <TasksWidget data={data} /> },
  ai: { title: "AI assistant", minW: 3, minH: 3, accent: "#A23B9E", icon: Sparkles, lg: { w: 4, h: 5 }, render: ({ ai }) => <AiWidget rows={ai} /> },
  pipeline: { title: "My pipeline", minW: 3, minH: 3, accent: "#0E7490", icon: Wallet, lg: { w: 6, h: 5 }, render: ({ data }) => <PipelineWidget data={data} /> },
  activity: { title: "Recent activity", minW: 3, minH: 3, accent: "#5E5E5A", icon: Activity, lg: { w: 3, h: 5 }, render: ({ data }) => <ActivityWidget data={data} /> },
  attention: { title: "Needs attention", minW: 3, minH: 3, accent: "#C4382D", icon: AlertTriangle, lg: { w: 3, h: 5 }, render: ({ data }) => <AttentionWidget data={data} /> },
};

const ORDER: WidgetId[] = ["stats", "today", "tasks", "ai", "pipeline", "activity", "attention"];

// The comp's dashboard is exactly: Key numbers ledger + three panels
// (Today's schedule / My tasks / AI assistant). Extra modules (pipeline,
// activity, attention) remain available via Customise → Add module.
const DEFAULT_LAYOUTS: Layouts = {
  lg: [
    { i: "stats", x: 0, y: 0, w: 12, h: 3 },
    { i: "today", x: 0, y: 3, w: 4, h: 6 },
    { i: "tasks", x: 4, y: 3, w: 4, h: 6 },
    { i: "ai", x: 8, y: 3, w: 4, h: 6 },
  ],
  md: [
    { i: "stats", x: 0, y: 0, w: 8, h: 3 },
    { i: "today", x: 0, y: 3, w: 4, h: 6 },
    { i: "tasks", x: 4, y: 3, w: 4, h: 6 },
    { i: "ai", x: 0, y: 9, w: 8, h: 5 },
  ],
};

const ResponsiveGridLayout = WidthProvider(Responsive);

type Config = { version: 2; widgets: WidgetId[]; layouts: { lg: Layout[]; md: Layout[] } };

function normalise(input: unknown): Config {
  const cfg = input as Partial<Config> | null;
  if (cfg && cfg.version === 2 && cfg.layouts?.lg?.length) {
    const widgets = cfg.layouts.lg.map((l) => l.i).filter((i): i is WidgetId => i in REGISTRY);
    return {
      version: 2,
      widgets,
      layouts: {
        lg: cfg.layouts.lg.filter((l) => l.i in REGISTRY),
        md: (cfg.layouts.md ?? cfg.layouts.lg).filter((l) => l.i in REGISTRY),
      },
    };
  }
  return {
    version: 2,
    widgets: DEFAULT_LAYOUTS.lg.map((l) => l.i as WidgetId),
    layouts: { lg: DEFAULT_LAYOUTS.lg, md: DEFAULT_LAYOUTS.md },
  };
}

export function DashboardGrid({
  data,
  ai,
  initialConfig,
}: {
  data: DashboardData;
  ai: AiWidgetRow[];
  initialConfig: unknown;
}) {
  const [mounted, setMounted] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [bp, setBp] = React.useState("lg");
  const [config, setConfig] = React.useState<Config>(() => normalise(initialConfig));
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => setMounted(true), []);

  // On mobile the single-column stack is fixed — drag/resize would only
  // break the layout, so editing is disabled there.
  const isMobile = bp === "sm";
  React.useEffect(() => {
    if (isMobile && editing) setEditing(false);
  }, [isMobile, editing]);

  const persist = React.useCallback((next: Config) => {
    setConfig(next);
    try {
      window.localStorage.setItem("fta-dashboard-v2", JSON.stringify(next));
    } catch {
      /* ignore quota */
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveDashboardLayout(next);
    }, 800);
  }, []);

  function onLayoutChange(_current: Layout[], all: Layouts) {
    if (!all.lg) return;
    const clean = (arr: Layout[] | undefined) =>
      (arr ?? []).filter((l) => config.widgets.includes(l.i as WidgetId)).map(({ i, x, y, w, h }) => ({ i, x, y, w, h }));
    persist({ version: 2, widgets: config.widgets, layouts: { lg: clean(all.lg), md: clean(all.md ?? all.lg) } });
  }

  function addWidget(id: WidgetId) {
    if (config.widgets.includes(id)) return;
    const def = REGISTRY[id];
    const item = { i: id, x: 0, y: Infinity, w: def.lg.w, h: def.lg.h };
    persist({
      version: 2,
      widgets: [...config.widgets, id],
      layouts: { lg: [...config.layouts.lg, item], md: [...config.layouts.md, { ...item, w: Math.min(def.lg.w, 8) }] },
    });
  }

  function removeWidget(id: WidgetId) {
    persist({
      version: 2,
      widgets: config.widgets.filter((w) => w !== id),
      layouts: {
        lg: config.layouts.lg.filter((l) => l.i !== id),
        md: config.layouts.md.filter((l) => l.i !== id),
      },
    });
  }

  async function reset() {
    setConfig(normalise(null));
    try {
      window.localStorage.removeItem("fta-dashboard-v2");
    } catch {
      /* ignore */
    }
    await resetDashboardLayout();
  }

  const available = ORDER.filter((id) => !config.widgets.includes(id));

  const applyMin = (arr: Layout[]) =>
    arr.map((l) => {
      const def = REGISTRY[l.i as WidgetId];
      const minH = def?.minH ?? 2;
      // Clamp height up to the widget's minimum so older saved layouts
      // (e.g. a 2-row Key numbers strip) grow to a size that fits their
      // content instead of squashing it.
      return { ...l, minW: def?.minW ?? 2, minH, h: Math.max(l.h, minH) };
    });
  const layouts: Layouts = { lg: applyMin(config.layouts.lg), md: applyMin(config.layouts.md) };

  return (
    <div>
      <div className={cn("mb-3 flex-wrap items-center justify-end gap-2", isMobile ? "hidden" : "flex")}>
        {editing ? (
          <>
            {available.length > 0 ? (
              <Menu
                trigger={
                  <span className="inline-flex">
                    <Button variant="outline" size="sm">
                      <Plus size={14} /> Add module
                    </Button>
                  </span>
                }
                align="end"
              >
                {available.map((id) => (
                  <MenuItem key={id} onClick={() => addWidget(id)}>
                    {REGISTRY[id].title}
                  </MenuItem>
                ))}
              </Menu>
            ) : null}
            <Button variant="ghost" size="sm" onClick={() => void reset()}>
              <RotateCcw size={14} /> Reset
            </Button>
            <Button size="sm" onClick={() => setEditing(false)}>
              Done
            </Button>
          </>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <LayoutGrid size={14} /> Customise
          </Button>
        )}
      </div>

      {!mounted ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {config.widgets.slice(0, 6).map((id) => (
            <div key={id} className="h-40 animate-pulse rounded-lg border border-line bg-surface" />
          ))}
        </div>
      ) : (
        <ResponsiveGridLayout
          className={cn("-mx-1", editing && "rounded-lg outline-2 outline-dashed outline-gold/30")}
          layouts={layouts}
          breakpoints={{ lg: 1024, md: 640, sm: 0 }}
          cols={{ lg: 12, md: 8, sm: 1 }}
          rowHeight={58}
          margin={[20, 20]}
          containerPadding={[4, 4]}
          isDraggable={editing && !isMobile}
          isResizable={editing && !isMobile}
          draggableHandle=".widget-drag"
          onLayoutChange={onLayoutChange}
          onBreakpointChange={(next) => setBp(next)}
          compactType="vertical"
        >
          {config.widgets.map((id) => {
            const def = REGISTRY[id];
            if (!def) return null;
            // Clean editorial chrome per the Aspen comp: hairline card, plain
            // bold title, no icon disc or coloured top-border. "Key numbers"
            // gets the gold top rule and an "Updated just now" note.
            const isStats = id === "stats";
            return (
              <div
                key={id}
                className={cn(
                  "flex flex-col overflow-hidden rounded-[18px] border border-line bg-surface shadow-xs",
                  isStats && "border-t-2 border-t-gold",
                )}
              >
                <div className={cn("flex shrink-0 items-center justify-between gap-2 border-b border-line px-5 py-3.5", editing && "bg-surface-2")}>
                  <div className="flex min-w-0 items-center gap-2">
                    {editing ? (
                      <span className="widget-drag cursor-grab text-fg-4 hover:text-fg-2 active:cursor-grabbing">
                        <GripVertical size={15} />
                      </span>
                    ) : null}
                    <h3 className="truncate text-[15px] font-extrabold tracking-tight text-fg-1">{def.title}</h3>
                  </div>
                  {!editing && isStats ? (
                    <span className="shrink-0 text-[12px] text-fg-3">Updated just now</span>
                  ) : null}
                  {editing ? (
                    <button
                      type="button"
                      onClick={() => removeWidget(id)}
                      className="rounded p-1 text-fg-4 hover:bg-surface-3 hover:text-danger"
                      title="Remove module"
                    >
                      <X size={14} />
                    </button>
                  ) : null}
                </div>
                <div className="min-h-0 flex-1">{def.render({ data, ai })}</div>
              </div>
            );
          })}
        </ResponsiveGridLayout>
      )}
      {editing ? (
        <p className="mt-2 text-center text-xs text-fg-3">
          Drag the handle to move a module, drag its bottom-right corner to resize. Changes save automatically.
        </p>
      ) : null}
    </div>
  );
}
