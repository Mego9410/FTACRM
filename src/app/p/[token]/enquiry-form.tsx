"use client";

import * as React from "react";
import { submitPracticeEnquiry } from "./actions";

/**
 * Public "request more information" form — mirrors the legacy FTA website
 * form: name / job title / email / company / phone / practice ref, plus the
 * consent and mailing-list checkboxes.
 */
export function EnquiryForm({ token, practiceRef }: { token: string; practiceRef: string }) {
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (done) {
    return (
      <div className="py-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-available-bg">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-available-fg">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
        <h3 className="mt-4 text-lg font-extrabold tracking-tight text-fg-1">Thank you — request received</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-fg-2">
          The team will be in touch shortly with the full details of ref {practiceRef}. If it's urgent,
          call us on 0330 088 1156.
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
    "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-fg-1 placeholder:text-fg-4 outline-none transition-shadow focus:border-gold focus:ring-2 focus:ring-gold/40";

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <input name="name" required placeholder="Your Name" aria-label="Your name" className={inputCls} />
        <input name="job_title" placeholder="Job Title" aria-label="Job title" className={inputCls} />
        <input name="email" type="email" required placeholder="Your Email" aria-label="Your email" className={inputCls} />
        <input name="company" placeholder="Company" aria-label="Company" className={inputCls} />
        <input name="phone" type="tel" placeholder="Telephone Number" aria-label="Telephone number" className={inputCls} />
        <input value={practiceRef} readOnly aria-label="Practice reference" className={`${inputCls} bg-surface-2 text-fg-3`} />
      </div>

      {/* Honeypot — humans never see or fill this. */}
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />

      <label className="flex items-start gap-2.5 text-sm leading-relaxed text-fg-2">
        <input type="checkbox" name="consent_contact" required className="mt-1 h-4 w-4 shrink-0 accent-[#E4AD25]" />
        <span>
          By submitting this form you are agreeing to receive phone, e-mail or postal communication from
          Frank Taylor &amp; Associates regarding the information detailed on this page. If you do not wish
          to receive updates about our services in the future, please tick the box below.
        </span>
      </label>
      <label className="flex items-start gap-2.5 text-sm leading-relaxed text-fg-2">
        <input type="checkbox" name="remove_from_list" className="mt-1 h-4 w-4 shrink-0 accent-[#E4AD25]" />
        <span>Please remove me from your mailing list (info only).</span>
      </label>
      <label className="flex items-start gap-2.5 text-sm leading-relaxed text-fg-2">
        <input type="checkbox" name="only_sale_details" className="mt-1 h-4 w-4 shrink-0 accent-[#E4AD25]" />
        <span>Please only send me details of practices for sale.</span>
      </label>

      {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}

      <div className="pt-1 text-center">
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-gold px-10 py-3.5 text-[15px] font-extrabold text-ink shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Sending…" : "Submit"}
        </button>
      </div>
    </form>
  );
}
