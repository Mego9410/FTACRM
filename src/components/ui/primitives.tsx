import * as React from "react";
import { cn } from "@/lib/utils";

/* ── Button ─────────────────────────────────────────────────────────── */

type ButtonVariant = "primary" | "dark" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-gold text-ink hover:bg-gold-hover shadow-xs hover:shadow-gold/40 border border-transparent",
  dark: "bg-ink text-white hover:bg-ink-pure border border-transparent",
  outline: "bg-surface text-fg-1 border border-line hover:border-gold hover:bg-gold-tint/40",
  ghost: "bg-transparent text-fg-2 hover:bg-surface-3 hover:text-fg-1 border border-transparent",
  danger: "bg-danger text-white hover:opacity-90 border border-transparent",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px] rounded-[10px] gap-1.5",
  md: "h-9.5 px-4 text-sm rounded-sm gap-2",
  lg: "h-11 px-5 text-[15px] rounded-md gap-2",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-semibold whitespace-nowrap transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    />
  );
}

/* ── Inputs ─────────────────────────────────────────────────────────── */

const fieldBase =
  "w-full rounded-sm border border-line bg-surface px-3 text-sm text-fg-1 placeholder:text-fg-4 transition-colors focus-visible:border-gold disabled:opacity-50 disabled:bg-surface-2";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBase, "h-9.5", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: React.Ref<HTMLTextAreaElement> }) {
  return <textarea className={cn(fieldBase, "py-2.5 min-h-24 leading-relaxed", className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldBase, "h-9.5 cursor-pointer appearance-none pr-8 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%235e5e5a%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_10px_center]", className)} {...props}>
      {children}
    </select>
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-[13px] font-semibold text-fg-1", className)}
      {...props}
    />
  );
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label?: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      {label ? <Label htmlFor={htmlFor}>{label}</Label> : null}
      {children}
      {hint && !error ? <p className="mt-1 text-xs text-fg-3">{hint}</p> : null}
      {error ? <p className="mt-1 text-xs font-medium text-danger">{error}</p> : null}
    </div>
  );
}

/* ── Badge / pills ──────────────────────────────────────────────────── */

type BadgeTone =
  | "neutral"
  | "gold"
  | "green"
  | "nhs"
  | "mixed"
  | "private"
  | "danger"
  | "warn"
  | "ink";

const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-surface-3 text-fg-2",
  gold: "bg-gold-tint text-gold-deep",
  green: "bg-private-bg text-private-fg",
  nhs: "bg-nhs-bg text-nhs-fg",
  mixed: "bg-mixed-bg text-mixed-fg",
  private: "bg-private-bg text-private-fg",
  danger: "bg-danger-bg text-danger",
  warn: "bg-warn-bg text-warn",
  ink: "bg-ink text-white",
};

export function Badge({
  tone = "neutral",
  className,
  style,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        badgeTones[tone],
        className,
      )}
      style={style}
      {...props}
    />
  );
}

/** Pill coloured from an admin lookup colour (hex) — tinted bg + strong fg. */
export function LookupPill({ color, children }: { color?: string | null; children: React.ReactNode }) {
  if (!color) return <Badge>{children}</Badge>;
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap"
      style={{ backgroundColor: `${color}1c`, color }}
    >
      {children}
    </span>
  );
}

/* ── Card ───────────────────────────────────────────────────────────── */

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-lg border border-line bg-surface shadow-xs", className)}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  action,
  className,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 border-b border-line px-5 py-3.5", className)}>
      <h3 className="text-[15px] font-bold text-fg-1">{title}</h3>
      {action}
    </div>
  );
}

/* ── Avatar ─────────────────────────────────────────────────────────── */

const avatarPalette = ["#B4862A", "#2F77BE", "#A23B9E", "#1F9D4D", "#5E5E5A", "#C4382D"];

export function Avatar({
  name,
  size = 32,
  color,
  className,
}: {
  name: string | null | undefined;
  size?: number;
  color?: string | null;
  className?: string;
}) {
  const label = (name ?? "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
  const bg =
    color ??
    avatarPalette[
      Math.abs([...(name ?? "?")].reduce((a, c) => a + c.charCodeAt(0), 0)) % avatarPalette.length
    ];
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white select-none", className)}
      style={{ width: size, height: size, backgroundColor: bg ?? undefined, fontSize: size * 0.38 }}
      title={name ?? undefined}
    >
      {label}
    </span>
  );
}

/* ── Empty state ────────────────────────────────────────────────────── */

export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-surface px-6 py-12 text-center", className)}>
      <p className="text-[15px] font-bold text-fg-1">{title}</p>
      {body ? <p className="max-w-sm text-sm text-fg-3">{body}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

/* ── Misc ───────────────────────────────────────────────────────────── */

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-line", className)} />;
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-line bg-surface-2 px-1.5 py-0.5 font-sans text-[11px] font-semibold text-fg-3">
      {children}
    </kbd>
  );
}
