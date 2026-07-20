"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/primitives";

/**
 * Modal dialog on the native <dialog> element — focus trapping, Esc, and
 * backdrop come free from the platform.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  wide,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
  className?: string;
}) {
  const ref = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onMouseDown={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-full rounded-lg border border-line bg-surface p-0 text-fg-2 shadow-lg backdrop:bg-ink/40",
        className,
      )}
      style={{ "--dialog-max": wide ? "48rem" : "32rem" } as React.CSSProperties}
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
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
      <div className="max-h-[75vh] overflow-y-auto p-5">{open ? children : null}</div>
    </dialog>
  );
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">{children}</div>;
}

/* ── Confirm helper ─────────────────────────────────────────────────── */

export function ConfirmButton({
  children,
  message,
  onConfirm,
  variant = "danger",
  size = "sm",
  confirmLabel = "Confirm",
  disabled,
}: {
  children: React.ReactNode;
  message: string;
  onConfirm: () => void | Promise<void>;
  variant?: "danger" | "primary" | "outline" | "dark" | "ghost";
  size?: "sm" | "md" | "lg";
  confirmLabel?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  return (
    <>
      <Button type="button" variant={variant} size={size} disabled={disabled} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Are you sure?">
        <p className="text-sm">{message}</p>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant={variant}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
                setOpen(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
