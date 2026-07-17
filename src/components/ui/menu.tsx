"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/** Lightweight dropdown menu: trigger + floating panel, closes on outside click / Esc. */
export function Menu({
  trigger,
  children,
  align = "end",
  className,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "end";
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <div onClick={() => setOpen((v) => !v)} className="cursor-pointer">
        {trigger}
      </div>
      {open ? (
        <div
          onClick={() => setOpen(false)}
          className={cn(
            "absolute z-50 mt-1.5 min-w-44 overflow-hidden rounded-md border border-line bg-surface py-1 shadow-md",
            align === "end" ? "right-0" : "left-0",
            className,
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function MenuItem({
  onClick,
  href,
  children,
  danger,
}: {
  onClick?: () => void;
  href?: string;
  children: React.ReactNode;
  danger?: boolean;
}) {
  const cls = cn(
    "flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm font-medium hover:bg-surface-2 cursor-pointer",
    danger ? "text-danger" : "text-fg-1",
  );
  if (href) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

export function MenuSeparator() {
  return <div className="my-1 border-t border-line" />;
}
