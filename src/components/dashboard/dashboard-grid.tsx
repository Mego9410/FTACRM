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

const DEFAULT_LAYOUTS: Layouts = {
  lg: [
    { i: "stats", x: 0, y: 0, w: 12, h: 3 },
    { i: "today", x: 0, y: 3, w: 4, h: 5 },
    { i: "tasks", x: 4, y: 3, w: 4, h: 5 },
    { i: "ai", x: 8, y: 3, w: 4, h: 5 },
    { i: "pipeline", x: 0, y: 8, w: 6, h: 5 },
    { i: "activity", x: 6, y: 8, w: 3, h: 5 },
    { i: "attention", x: 9, y: 8, w: 3, h: 5 },
  ],
  md: [
    { i: "stats", x: 0, y: 0, w: 8, h: 3 },
    { i: "today", x: 0, y: 3, w: 4, h: 5 },
    { i: "tasks", x: 4, y: 3, w: 4, h: 5 },
    { i: "ai", x: 0, y: 8, w: 4, h: 5 },
    { i: "attention", x: 4, y: 8, w: 4, h: 5 },
    { i: "pipeline", x: 0, y: 13, w: 8, h: 5 },
    { i: "activity", x: 0, y: 18, w: 8, h: 4 },
  ],
};

const ResponsiveGridLayout = WidthProvider(Responsive);

type Config = { version: 1; widgets: WidgetId[]; layouts: { lg: Layout[]; md: Layout[] } };

function normalise(input: unknown): Config {
  const cfg = input as Partial<Config> | null;
  if (cfg && cfg.version === 1 && cfg.layouts?.lg?.length) {
    const widgets = cfg.layouts.lg.map((l) => l.i).filter((i): i is WidgetId => i in REGISTRY);
    return {
      version: 1,
      widgets,
      layouts: {
        lg: cfg.layouts.lg.filter((l) => l.i in REGISTRY),
        md: (cfg.layouts.md ?? cfg.layouts.lg).filter((l) => l.i in REGISTRY),
      },
    };
  }
  return {
    version: 1,
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
      window.localStorage.setItem("fta-dashboard-v1", JSON.stringify(next));
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
    persist({ version: 1, widgets: config.widgets, layouts: { lg: clean(all.lg), md: clean(all.md ?? all.lg) } });
  }

  function addWidget(id: WidgetId) {
    if (config.widgets.includes(id)) return;
    const def = REGISTRY[id];
    const item = { i: id, x: 0, y: Infinity, w: def.lg.w, h: def.lg.h };
    persist({
      version: 1,
      widgets: [...config.widgets, id],
      layouts: { lg: [...config.layouts.lg, item], md: [...config.layouts.md, { ...item, w: Math.min(def.lg.w, 8) }] },
    });
  }

  function removeWidget(id: WidgetId) {
    persist({
      version: 1,
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
      window.localStorage.removeItem("fta-dashboard-v1");
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
          margin={[16, 16]}
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
            const Icon = def.icon;
            return (
              <div
                key={id}
                className="overflow-hidden rounded-lg border border-t-2 border-line bg-surface shadow-xs"
                style={{ borderTopColor: def.accent }}
              >
                <div
                  className={cn("flex items-center justify-between border-b border-line px-3.5 py-2.5", editing && "bg-surface-2")}
                  style={editing ? undefined : { background: `linear-gradient(90deg, ${def.accent}12, transparent 65%)` }}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {editing ? (
                      <span className="widget-drag cursor-grab text-fg-4 hover:text-fg-2 active:cursor-grabbing">
                        <GripVertical size={15} />
                      </span>
                    ) : (
                      <span
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                        style={{ backgroundColor: `${def.accent}1f`, color: def.accent }}
                      >
                        <Icon size={14} />
                      </span>
                    )}
                    <h3 className="truncate text-[13px] font-bold text-fg-1">{def.title}</h3>
                  </div>
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
                <div className="h-[calc(100%-47px)]">{def.render({ data, ai })}</div>
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
