import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  eyebrow,
  subtitle,
  actions,
  className,
}: {
  title: React.ReactNode;
  eyebrow?: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-gold-deep">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-[24px] font-extrabold tracking-tight text-fg-1 sm:text-[26px]">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-sm text-fg-3">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
