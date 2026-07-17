import { cn, formatDate } from "@/lib/utils";

export type StageState = {
  id: string;
  label: string;
  sort_order: number;
  achieved_on: string | null;
};

/**
 * The 7-segment progression tracker: green = achieved (date on hover),
 * gold pulse = current, neutral = upcoming.
 */
export function StageTracker({
  stages,
  size = "sm",
  dealStatus,
}: {
  stages: StageState[];
  size?: "sm" | "lg";
  dealStatus: string;
}) {
  const firstUnachieved = stages.find((s) => !s.achieved_on);
  return (
    <div className={cn("flex items-center", size === "lg" ? "gap-1.5" : "gap-1")}>
      {stages.map((s) => {
        const achieved = !!s.achieved_on;
        const isCurrent = dealStatus === "in_progress" && firstUnachieved?.id === s.id;
        return (
          <div
            key={s.id}
            className={cn("group relative", size === "lg" ? "flex-1" : "w-6")}
            title={`${s.label}${s.achieved_on ? ` — ${formatDate(s.achieved_on)}` : ""}`}
          >
            <div
              className={cn(
                "rounded-full transition-colors",
                size === "lg" ? "h-2.5" : "h-1.5",
                achieved
                  ? "bg-available-fg"
                  : isCurrent
                    ? "animate-pulse bg-gold"
                    : dealStatus === "fallen_through"
                      ? "bg-danger/30"
                      : "bg-line",
              )}
            />
            {size === "lg" ? (
              <p
                className={cn(
                  "mt-1.5 text-[11px] font-semibold leading-tight",
                  achieved ? "text-available-fg" : isCurrent ? "text-gold-deep" : "text-fg-4",
                )}
              >
                {s.label}
                {s.achieved_on ? <span className="block font-normal text-fg-3">{formatDate(s.achieved_on)}</span> : null}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
