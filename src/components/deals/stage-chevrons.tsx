import { Check, Play } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

export type ChevronStage = {
  id: string;
  label: string;
  sort_order: number;
  achieved_on: string | null;
};

const ARROW = 16;

/**
 * Full-width breadcrumb-style progression bar: interlocking chevrons, one per
 * deal stage. Green = achieved (with its date), gold = the stage in play,
 * red = still to come. Wrap in an `overflow-x-auto` container on narrow screens.
 */
export function StageChevrons({ stages, dealStatus }: { stages: ChevronStage[]; dealStatus: string }) {
  const firstUnachieved = stages.find((s) => !s.achieved_on);
  const inProgress = dealStatus === "in_progress" || dealStatus === "on_hold";

  return (
    <div className="flex items-stretch gap-[3px]">
      {stages.map((s, i) => {
        const isFirst = i === 0;
        const isLast = i === stages.length - 1;
        const achieved = !!s.achieved_on;
        const isCurrent = inProgress && firstUnachieved?.id === s.id;
        const clip = isFirst
          ? `polygon(0 0, calc(100% - ${ARROW}px) 0, 100% 50%, calc(100% - ${ARROW}px) 100%, 0 100%)`
          : isLast
            ? `polygon(0 0, 100% 0, 100% 100%, 0 100%, ${ARROW}px 50%)`
            : `polygon(0 0, calc(100% - ${ARROW}px) 0, 100% 50%, calc(100% - ${ARROW}px) 100%, 0 100%, ${ARROW}px 50%)`;
        const tone = achieved
          ? "bg-available-fg text-white"
          : isCurrent
            ? "bg-gold text-ink"
            : "bg-surface-2 text-fg-3";
        const glyphColor = achieved ? "text-available-fg" : isCurrent ? "text-gold-deep" : "text-fg-3";
        return (
          <div
            key={s.id}
            style={{ clipPath: clip }}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2 py-2.5",
              isFirst ? "rounded-l-sm pl-3" : "pl-6",
              isLast ? "rounded-r-sm pr-3" : "pr-2",
              tone,
            )}
          >
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold",
                glyphColor,
              )}
            >
              {achieved ? (
                <Check size={13} strokeWidth={3} />
              ) : isCurrent ? (
                <Play size={11} className="translate-x-[1px] fill-current" />
              ) : (
                s.sort_order
              )}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block break-words text-[12px] font-semibold">{s.label}</span>
              {s.achieved_on ? (
                <span className="block text-[11px] opacity-90">{formatDate(s.achieved_on)}</span>
              ) : isCurrent ? (
                <span className="block text-[11px] opacity-90">Current</span>
              ) : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}
