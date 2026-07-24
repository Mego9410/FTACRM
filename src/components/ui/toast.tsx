"use client";

import * as React from "react";
import { Check, X, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";
type Toast = { id: number; message: string; tone: ToastTone };

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = React.createContext<ToastApi | null>(null);

/** Access the toast API. Safe no-op if used outside the provider. */
export function useToast(): ToastApi {
  const ctx = React.useContext(ToastContext);
  return (
    ctx ?? {
      success: () => {},
      error: () => {},
      info: () => {},
    }
  );
}

const TONE: Record<ToastTone, { icon: React.ReactNode; ring: string }> = {
  success: { icon: <Check size={15} />, ring: "text-available-fg" },
  error: { icon: <AlertTriangle size={15} />, ring: "text-danger" },
  info: { icon: <Info size={15} />, ring: "text-gold-deep" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const seq = React.useRef(0);

  const dismiss = React.useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = React.useCallback(
    (message: string, tone: ToastTone) => {
      const id = ++seq.current;
      setToasts((t) => [...t, { id, message, tone }]);
      window.setTimeout(() => dismiss(id), 4200);
    },
    [dismiss],
  );

  const api = React.useMemo<ToastApi>(
    () => ({
      success: (m) => push(m, "success"),
      error: (m) => push(m, "error"),
      info: (m) => push(m, "info"),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex items-start gap-2.5 rounded-xl border border-line bg-surface px-3.5 py-3 shadow-lg animate-[slidein_.18s_ease-out]"
          >
            <span className={cn("mt-0.5 shrink-0", TONE[t.tone].ring)}>{TONE[t.tone].icon}</span>
            <p className="min-w-0 flex-1 text-sm font-medium text-fg-1">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded-md p-0.5 text-fg-4 hover:bg-surface-2 hover:text-fg-1"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
