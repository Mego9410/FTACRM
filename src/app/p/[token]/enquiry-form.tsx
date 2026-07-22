"use client";

import * as React from "react";
import { submitPracticeEnquiry } from "./actions";

/**
 * Public "request more information" form — the legacy FTA field set (name /
 * job title / email / company / phone / practice ref + the consent and
 * mailing-list checkboxes), restyled for conversion: labels above fields,
 * one clear primary action, reassurance under the button.
 */
export function EnquiryForm({ token, practiceRef }: { token: string; practiceRef: string }) {
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (done) {
    return (
      <div className="py-10 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-ink">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
        <h3 className="mt-5 text-xl font-extrabold tracking-tight text-fg-1">Request received — thank you</h3>
        <p className="mx-auto mt-3 max-w-sm text-[14.5px] leading-relaxed text-fg-2">
          The team will be in touch within one working day with the full details of ref {practiceRef}. If
          it's urgent, call us on <span className="font-bold text-fg-1">0330 088 1156</span>.
        </p>
      </div>
    );
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const f = new FormData(e.currentTarget);
    const res = await submitPracticeEnquiry({
      token,
      name: String(f.get("name") ?? "").trim(),
      job_title: String(f.get("job_title") ?? "").trim() || null,
      email: String(f.get("email") ?? "").trim(),
      company: String(f.get("company") ?? "").trim() || null,
      phone: String(f.get("phone") ?? "").trim() || null,
      consent_contact: f.get("consent_contact") === "on",
      remove_from_list: f.get("remove_from_list") === "on",
      only_sale_details: f.get("only_sale_details") === "on",
      website: String(f.get("website") ?? ""),
    });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setDone(true);
  }

  const inputCls =
    "w-full rounded-xl border border-line bg-white px-4 py-3 text-[15px] text-fg-1 placeholder:text-fg-4 outline-none transition-shadow focus:border-gold focus:ring-2 focus:ring-gold/40";
  const labelCls = "mb-1.5 block text-[12.5px] font-bold text-fg-2";

  return (
    <form onSubmit={submit}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-extrabold tracking-tight text-fg-1">Request more information</h3>
        <span className="rounded-full bg-surface-2 px-3 py-1 text-[12px] font-bold text-fg-3">Ref {practiceRef}</span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pe_name" className={labelCls}>Your name *</label>
          <input id="pe_name" name="name" required autoComplete="name" placeholder="Dr Jane Smith" className={inputCls} />
        </div>
        <div>
          <label htmlFor="pe_job" className={labelCls}>Job title</label>
          <input id="pe_job" name="job_title" autoComplete="organization-title" placeholder="Principal dentist" className={inputCls} />
        </div>
        <div>
          <label htmlFor="pe_email" className={labelCls}>Email *</label>
          <input id="pe_email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" className={inputCls} />
        </div>
        <div>
          <label htmlFor="pe_company" className={labelCls}>Company</label>
          <input id="pe_company" name="company" autoComplete="organization" placeholder="Optional" className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="pe_phone" className={labelCls}>Telephone</label>
          <input id="pe_phone" name="phone" type="tel" autoComplete="tel" placeholder="So we can talk you through the details" className={inputCls} />
        </div>
      </div>

      {/* Honeypot — humans never see or fill this. */}
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />

      <div className="mt-6 space-y-3.5 rounded-xl bg-surface-2 p-4">
        <label className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-fg-2">
          <input type="checkbox" name="consent_contact" required className="mt-0.5 h-4 w-4 shrink-0 accent-[#E4AD25]" />
          <span>
            By submitting this form you are agreeing to receive phone, e-mail or postal communication from
            Frank Taylor &amp; Associates regarding the information detailed on this page. If you do not wish
            to receive updates about our services in the future, please tick the box below.
          </span>
        </label>
        <label className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-fg-2">
          <input type="checkbox" name="remove_from_list" className="mt-0.5 h-4 w-4 shrink-0 accent-[#E4AD25]" />
          <span>Please remove me from your mailing list (info only).</span>
        </label>
        <label className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-fg-2">
          <input type="checkbox" name="only_sale_details" className="mt-0.5 h-4 w-4 shrink-0 accent-[#E4AD25]" />
          <span>Please only send me details of practices for sale.</span>
        </label>
      </div>

      {error ? <p className="mt-4 text-sm font-semibold text-danger">{error}</p> : null}

      <button
        type="submit"
        disabled={busy}
        className="mt-6 w-full rounded-2xl bg-gold py-4 text-[16px] font-extrabold text-ink shadow-[0_8px_30px_-8px_rgba(228,173,37,0.6)] transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
      >
        {busy ? "Sending…" : "Request Full Details"}
      </button>
      <p className="mt-3 text-center text-[12px] font-semibold text-fg-4">
        No obligation · handled in strict confidence · response within one working day
      </p>
    </form>
  );
}
