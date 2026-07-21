"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, FileUp, Rocket, TriangleAlert, X } from "lucide-react";
import { Badge, Button, Card, CardHeader, Field, Input } from "@/components/ui/primitives";
import { cn, formatDateTime } from "@/lib/utils";
import { createLaunch } from "../actions";

type LaunchBuyer = {
  contact_id: string;
  name: string;
  email: string | null;
  temperature: string | null;
  score: number;
  facets: string[];
  excluded: boolean;
  do_not_contact: boolean;
  consent_email: boolean | null;
  suppressed: boolean;
};

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/** Why a buyer can't be emailed, or null if sendable. */
function blockReason(b: LaunchBuyer): string | null {
  if (!b.email) return "No email";
  if (b.do_not_contact) return "Do not contact";
  if (b.consent_email === false) return "No email consent";
  if (b.suppressed) return "Suppressed";
  return null;
}

export function LaunchBuilder({
  practiceId,
  practiceRef,
  preview,
  buyers,
  sendingEnabled,
}: {
  practiceId: string;
  practiceRef: string;
  preview: { subject: string; html: string };
  buyers: LaunchBuyer[];
  sendingEnabled: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(
    () => new Set(buyers.filter((b) => !blockReason(b) && !b.excluded).map((b) => b.contact_id)),
  );
  const [dnsEmails, setDnsEmails] = React.useState<Set<string>>(new Set());
  const [dnsFileName, setDnsFileName] = React.useState<string | null>(null);
  const [mode, setMode] = React.useState<"now" | "schedule">("now");
  const [scheduleAt, setScheduleAt] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const sendable = buyers.filter((b) => !blockReason(b));
  const dnsHit = (b: LaunchBuyer) => Boolean(b.email && dnsEmails.has(b.email.toLowerCase()));
  const finalCount = [...selected].filter((id) => {
    const b = buyers.find((x) => x.contact_id === id);
    return b && !blockReason(b) && !dnsHit(b);
  }).length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onDnsFile(file: File) {
    const text = await file.text();
    const emails = new Set([...(text.match(EMAIL_RE) ?? [])].map((e) => e.toLowerCase()));
    setDnsEmails(emails);
    setDnsFileName(file.name);
    // Untick anyone on the list.
    setSelected((prev) => {
      const next = new Set(prev);
      for (const b of buyers) {
        if (b.email && emails.has(b.email.toLowerCase())) next.delete(b.contact_id);
      }
      return next;
    });
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await createLaunch({
      practice_id: practiceId,
      contact_ids: [...selected].filter((id) => {
        const b = buyers.find((x) => x.contact_id === id);
        return b && !blockReason(b) && !dnsHit(b);
      }),
      do_not_send_emails: [...dnsEmails].slice(0, 5000),
      scheduled_at: mode === "schedule" && scheduleAt ? new Date(scheduleAt).toISOString() : null,
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.push("/launches");
    router.refresh();
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_460px]">
      <div className="space-y-5">
        {!sendingEnabled ? (
          <div className="flex items-start gap-2.5 rounded-md border border-warn/40 bg-warn-bg px-4 py-3 text-sm font-semibold text-warn">
            <TriangleAlert size={16} className="mt-0.5 shrink-0" />
            No email provider is linked yet — the launch will queue (or schedule) now and send automatically once
            Resend is connected.
          </div>
        ) : null}

        <Card>
          <CardHeader
            title={
              <>
                Matched buyers{" "}
                <span className="ml-1 text-xs font-semibold text-fg-3">
                  {finalCount} of {sendable.length} selected
                </span>
              </>
            }
            action={
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setSelected(new Set(sendable.filter((b) => !dnsHit(b)).map((b) => b.contact_id)))
                  }
                >
                  Select all
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>
                  Clear
                </Button>
              </div>
            }
          />
          <ul className="max-h-[520px] divide-y divide-line overflow-y-auto">
            {buyers.length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-fg-3">
                No buyers match this practice's criteria yet.
              </li>
            ) : (
              buyers.map((b) => {
                const reason = blockReason(b);
                const onDns = dnsHit(b);
                const disabled = Boolean(reason) || onDns;
                const checked = selected.has(b.contact_id) && !disabled;
                return (
                  <li
                    key={b.contact_id}
                    className={cn("flex items-center gap-3 px-5 py-2.5", disabled && "opacity-55")}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggle(b.contact_id)}
                      className="h-4 w-4 shrink-0 accent-[#E4AD25]"
                      aria-label={b.name}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-fg-1">{b.name}</p>
                      <p className="truncate text-xs text-fg-3">{b.email ?? "no email"}{b.facets.length ? ` · ${b.facets.join(" · ")}` : ""}</p>
                    </div>
                    {b.temperature ? (
                      <Badge
                        tone={b.temperature === "hot" ? "danger" : b.temperature === "warm" ? "gold" : "nhs"}
                        className="capitalize"
                      >
                        {b.temperature}
                      </Badge>
                    ) : null}
                    <span className="w-10 text-right text-xs font-bold text-gold-deep">{b.score}</span>
                    {onDns ? (
                      <Badge tone="danger">Do-not-send list</Badge>
                    ) : reason ? (
                      <Badge tone="neutral">{reason}</Badge>
                    ) : b.excluded ? (
                      <Badge tone="warn">Previously excluded</Badge>
                    ) : null}
                  </li>
                );
              })
            )}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Do-not-send list" />
          <div className="space-y-3 p-5">
            <p className="text-sm text-fg-2">
              Upload a CSV or text file of email addresses to exclude — matching buyers are unticked automatically
              and blocked server-side as well.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-fg-1 hover:bg-surface-2">
                <FileUp size={15} />
                {dnsFileName ? "Replace file" : "Upload file"}
                <input
                  type="file"
                  accept=".csv,.txt,text/csv,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onDnsFile(f);
                    e.target.value = "";
                  }}
                />
              </label>
              {dnsFileName ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-3 px-3 py-1 text-[13px] font-semibold text-fg-2">
                  {dnsFileName} — {dnsEmails.size} address{dnsEmails.size === 1 ? "" : "es"}
                  <button
                    type="button"
                    aria-label="Remove do-not-send list"
                    onClick={() => {
                      setDnsEmails(new Set());
                      setDnsFileName(null);
                    }}
                    className="rounded-full p-0.5 hover:bg-black/10"
                  >
                    <X size={13} />
                  </button>
                </span>
              ) : null}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="When to send" />
          <div className="space-y-3 p-5">
            <div className="flex flex-wrap gap-2">
              <Button variant={mode === "now" ? "dark" : "outline"} size="sm" onClick={() => setMode("now")}>
                <Rocket size={14} /> Send now
              </Button>
              <Button
                variant={mode === "schedule" ? "dark" : "outline"}
                size="sm"
                onClick={() => setMode("schedule")}
              >
                <CalendarClock size={14} /> Schedule
              </Button>
            </div>
            {mode === "schedule" ? (
              <Field label="Send at" htmlFor="ln_at" hint="Europe/London — your local time">
                <Input
                  id="ln_at"
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={(e) => setScheduleAt(e.target.value)}
                  min={new Date(Date.now() + 5 * 60_000).toISOString().slice(0, 16)}
                  className="w-64"
                />
              </Field>
            ) : null}
          </div>
        </Card>

        {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
        <div className="flex items-center justify-end gap-3">
          <p className="text-sm text-fg-3">
            {finalCount} buyer{finalCount === 1 ? "" : "s"} will receive ref {practiceRef}
          </p>
          <Button
            onClick={() => void submit()}
            disabled={busy || finalCount === 0 || (mode === "schedule" && !scheduleAt)}
          >
            {busy
              ? "Working…"
              : mode === "schedule"
                ? `Schedule launch${scheduleAt ? ` — ${formatDateTime(scheduleAt)}` : ""}`
                : "Launch now"}
          </Button>
        </div>
      </div>

      <div className="min-w-0">
        <Card className="xl:sticky xl:top-20">
          <CardHeader title="Email preview" />
          <div className="border-b border-line px-5 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-fg-3">Subject</p>
            <p className="mt-0.5 text-sm font-semibold text-fg-1">{preview.subject}</p>
          </div>
          <iframe
            title="Launch email preview"
            srcDoc={preview.html}
            sandbox=""
            className="h-[640px] w-full rounded-b-lg bg-surface-2"
          />
        </Card>
      </div>
    </div>
  );
}
