"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Right-hand slide-over panel (HubSpot-style) — an alternative to a centred modal. */
export function SlideOver({
  open,
  onClose,
  title,
  children,
  footer,
  width = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: "md" | "lg";
}) {
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/30" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "absolute inset-y-0 right-0 flex w-full flex-col border-l border-line bg-surface shadow-lg animate-[slidein_.2s_ease-out]",
          width === "lg" ? "max-w-lg" : "max-w-md",
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-3.5">
          <h3 className="text-[15px] font-bold text-fg-1">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-fg-3 hover:bg-surface-3 hover:text-fg-1"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer ? <div className="shrink-0 border-t border-line px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}
