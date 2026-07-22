import type { Metadata } from "next";
import { Check, FileText, KeyRound, Landmark, ShieldCheck } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PracticeMap } from "@/components/practices/practice-map";
import { priceLabel } from "@/lib/email/launch-template";
import { EnquiryForm } from "./enquiry-form";

/**
 * Public practice landing page — /p/<token>. No login; reached from launch
 * emails. Confidential by design: shows the marketing title and general area
 * only, never the trading name, street address or postcode.
 */

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PublicPractice = {
  id: string;
  ref: string;
  display_title: string;
  town: string | null;
  county: string | null;
  lat: number | null;
  lng: number | null;
  status: string;
  asking_price: number | null;
  price_prefix: string;
  funding_type_id: string | null;
  tenure_type_id: string | null;
  specialism_ids: string[];
  surgeries: number | null;
  annual_turnover: number | null;
  ebitda: number | null;
  nhs_contract_value: number | null;
  udas: number | null;
  staff_count: number | null;
  description: string | null;
  archived_at: string | null;
};

async function loadPractice(token: string): Promise<PublicPractice | null> {
  if (!UUID_RE.test(token)) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("practices")
    .select(
      "id, ref, display_title, town, county, lat, lng, status, asking_price, price_prefix, funding_type_id, tenure_type_id, specialism_ids, surgeries, annual_turnover, ebitda, nhs_contract_value, udas, staff_count, description, archived_at",
    )
    .eq("public_token", token)
    .maybeSingle();
  return (data as PublicPractice | null) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const practice = await loadPractice(token);
  return {
    title: practice
      ? `${practice.display_title} — Frank Taylor & Associates`
      : "Practice details — Frank Taylor & Associates",
    robots: { index: false, follow: false },
  };
}

const gbp = (v: number | null) =>
  v == null ? null : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(v);

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  available: { label: "Available now", className: "bg-available-fg/15 text-[#7ee694]" },
  under_offer: { label: "Under offer", className: "bg-gold/15 text-gold" },
  sold_stc: { label: "Sold STC", className: "bg-gold/15 text-gold" },
  valuation: { label: "Coming to market", className: "bg-gold/15 text-gold" },
  preparing: { label: "Coming to market", className: "bg-gold/15 text-gold" },
};

export default async function PublicPracticePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const practice = await loadPractice(token);

  if (!practice || practice.archived_at || ["completed", "withdrawn"].includes(practice.status)) {
    return (
      <Shell>
        <main className="flex flex-1 items-center bg-ink">
          <div className="mx-auto w-full max-w-2xl px-6 py-24 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">Frank Taylor &amp; Associates</p>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {practice ? "This practice has found its buyer" : "This link isn't recognised"}
            </h1>
            <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-white/60">
              {practice
                ? "It has been sold or withdrawn from the market. We bring practices like it to market every week — tell us what you're looking for and you'll hear about the next one first."
                : "The page you're after may have moved. If you received this link in an email, reply to it and we'll send you the latest details."}
            </p>
            <a
              href="https://ft-associates.com"
              className="mt-8 inline-block rounded-2xl bg-gold px-8 py-4 text-[15px] font-extrabold text-ink transition-opacity hover:opacity-90"
            >
              Talk To The Team
            </a>
          </div>
        </main>
      </Shell>
    );
  }

  const admin = createAdminClient();
  const lookupIds = [practice.funding_type_id, practice.tenure_type_id, ...(practice.specialism_ids ?? [])].filter(
    (x): x is string => Boolean(x),
  );
  const [{ data: lookups }, { data: photoRow }] = await Promise.all([
    lookupIds.length
      ? admin.from("lookup_values").select("id, value").in("id", lookupIds)
      : Promise.resolve({ data: [] as { id: string; value: string }[] }),
    admin.from("practices").select("headline_image_path").eq("id", practice.id).maybeSingle(),
  ]);
  const lookupById = new Map((lookups ?? []).map((l) => [l.id, l.value]));
  const funding = practice.funding_type_id ? (lookupById.get(practice.funding_type_id) ?? null) : null;
  const tenure = practice.tenure_type_id ? (lookupById.get(practice.tenure_type_id) ?? null) : null;
  const specialisms = (practice.specialism_ids ?? []).map((id) => lookupById.get(id)).filter((x): x is string => Boolean(x));

  let photoUrl: string | null = null;
  const headlinePath = (photoRow as { headline_image_path?: string | null } | null)?.headline_image_path ?? null;
  if (headlinePath) {
    const { data: signed } = await admin.storage.from("documents").createSignedUrl(headlinePath, 60 * 60);
    photoUrl = signed?.signedUrl ?? null;
  }

  const location = [practice.town, practice.county].filter(Boolean).join(", ");
  const price = priceLabel(practice.asking_price, practice.price_prefix);
  const badge = STATUS_BADGE[practice.status] ?? null;

  // The three or four numbers that sell the practice, given star billing.
  const heroStats: { label: string; value: string }[] = [
    { label: "Surgeries", value: practice.surgeries != null ? String(practice.surgeries) : null },
    { label: "Annual turnover", value: gbp(practice.annual_turnover) },
    { label: "EBITDA", value: gbp(practice.ebitda) },
    { label: "Team", value: practice.staff_count != null ? String(practice.staff_count) : null },
  ].filter((f): f is { label: string; value: string } => Boolean(f.value));

  // Everything else lives in the details panel.
  const detailRows: { label: string; value: string }[] = [
    { label: "Asking price", value: price },
    { label: "Funding", value: funding },
    { label: "Tenure", value: tenure },
    { label: "Surgeries", value: practice.surgeries != null ? String(practice.surgeries) : null },
    { label: "Annual turnover", value: gbp(practice.annual_turnover) },
    { label: "EBITDA", value: gbp(practice.ebitda) },
    { label: "NHS contract value", value: gbp(practice.nhs_contract_value) },
    { label: "UDAs", value: practice.udas != null ? practice.udas.toLocaleString("en-GB") : null },
    { label: "Team size", value: practice.staff_count != null ? String(practice.staff_count) : null },
    { label: "Location", value: location || null },
    { label: "Reference", value: practice.ref },
  ].filter((f): f is { label: string; value: string } => Boolean(f.value));

  const paragraphs = (practice.description ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <Shell stickyCta>
      <main className="flex-1">
        {/* ── Hero: dark, editorial, price given real scale ─────────────── */}
        <section className="bg-ink text-white">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 pb-28 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-36 lg:pt-20">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-bold uppercase tracking-[0.22em] text-gold">
                Confidential sale
                <span className="h-px w-8 bg-gold/40" aria-hidden />
                <span className="text-white/50">Ref {practice.ref}</span>
              </p>
              <h1 className="mt-5 text-[40px] font-extrabold leading-[1.04] tracking-[-0.03em] sm:text-[54px]">
                {practice.display_title}
                <span className="text-gold">.</span>
              </h1>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {location ? (
                  <span className="rounded-full bg-white/10 px-3.5 py-1.5 text-[13px] font-semibold text-white/85">{location}</span>
                ) : null}
                {badge ? (
                  <span className={`rounded-full px-3.5 py-1.5 text-[13px] font-bold ${badge.className}`}>{badge.label}</span>
                ) : null}
              </div>
              <p className="mt-9 text-[13px] font-bold uppercase tracking-[0.18em] text-white/45">Asking price</p>
              <p className="mt-1 text-[44px] font-extrabold leading-none tracking-[-0.03em] text-gold sm:text-[56px]">{price}</p>
              <p className="mt-7 max-w-lg text-[15.5px] leading-[1.7] text-white/65">
                Offered in strict confidence through Frank Taylor &amp; Associates. The practice name and exact
                location are withheld here — register your interest and we'll share the full picture with you directly.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-5">
                <a
                  href="#enquire"
                  className="rounded-2xl bg-gold px-8 py-4 text-[15px] font-extrabold text-ink shadow-[0_8px_30px_-6px_rgba(228,173,37,0.55)] transition-transform hover:-translate-y-0.5"
                >
                  Request Full Details
                </a>
                <span className="text-sm font-semibold text-white/50">
                  Takes under a minute · no obligation
                </span>
              </div>
            </div>

            <div className="relative">
              <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)]">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl} alt="The practice" className="max-h-[440px] w-full object-cover" />
                ) : (
                  <div className="bg-gradient-to-br from-white via-surface-2 to-gold-tint/60 px-10 py-8">
                    <div className="mx-auto max-w-[250px]">
                      <PracticeMap lat={practice.lat} lng={practice.lng} />
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-line bg-white px-5 py-3.5">
                  <p className="text-[12.5px] font-bold text-fg-2">
                    {photoUrl ? "The practice" : "Approximate area only"}
                  </p>
                  <p className="text-[12.5px] font-semibold text-fg-4">Exact location on request</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Overlapping stats card — the numbers do the talking ───────── */}
        {heroStats.length >= 2 ? (
          <section className="relative z-10 mx-auto -mt-16 w-full max-w-6xl px-6 lg:-mt-20">
            <div className="grid divide-y divide-line overflow-hidden rounded-[20px] border border-line bg-white shadow-[0_20px_50px_-25px_rgba(15,15,10,0.35)] sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
              {heroStats.map((s) => (
                <div key={s.label} className="px-7 py-6">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-fg-4">{s.label}</p>
                  <p className="mt-1.5 text-[30px] font-extrabold leading-none tracking-[-0.02em] text-fg-1 [font-feature-settings:'tnum']">
                    {s.value}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* ── About + details: asymmetric editorial spread ──────────────── */}
        <section className="mx-auto grid w-full max-w-6xl gap-12 px-6 pb-20 pt-16 lg:grid-cols-[1fr_380px] lg:gap-20 lg:pt-20">
          <div className="min-w-0">
            <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-gold-deep">The opportunity</p>
            <h2 className="mt-3 text-[28px] font-extrabold leading-tight tracking-[-0.02em] text-fg-1 sm:text-[32px]">
              {paragraphs.length ? "Why this practice deserves a closer look" : "The full story is one request away"}
            </h2>
            {paragraphs.length ? (
              <div className="mt-6 space-y-5">
                {paragraphs.map((p, i) => (
                  <p key={i} className="max-w-[62ch] text-[16px] leading-[1.8] text-fg-2">{p}</p>
                ))}
              </div>
            ) : (
              <p className="mt-6 max-w-[62ch] text-[16px] leading-[1.8] text-fg-2">
                Some things are better discussed than written down. Request the details and we'll talk you
                through the practice, its numbers and its potential — candidly and in confidence.
              </p>
            )}
            {specialisms.length ? (
              <div className="mt-8">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-fg-4">Clinical mix</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {specialisms.map((s) => (
                    <span key={s} className="rounded-full bg-gold-tint px-4 py-1.5 text-[13px] font-bold text-gold-deep">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-10 flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface px-6 py-5">
              <p className="min-w-0 flex-1 text-[15px] font-semibold text-fg-1">
                Like what you see so far? The accounts tell an even better story.
              </p>
              <a
                href="#enquire"
                className="rounded-xl bg-ink px-5 py-2.5 text-sm font-extrabold text-white transition-opacity hover:opacity-90"
              >
                See The Numbers
              </a>
            </div>
          </div>

          <aside className="lg:pt-2">
            <div className="rounded-[20px] border border-line bg-white p-7 shadow-sm lg:sticky lg:top-6">
              <h3 className="text-[15px] font-extrabold tracking-tight text-fg-1">The details</h3>
              <dl className="mt-4 divide-y divide-line">
                {detailRows.map((r) => (
                  <div key={r.label} className="flex items-baseline justify-between gap-4 py-2.5">
                    <dt className="text-[13px] font-semibold text-fg-3">{r.label}</dt>
                    <dd className="text-right text-[14px] font-extrabold text-fg-1 [font-feature-settings:'tnum']">{r.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 flex items-start gap-2 text-[12.5px] leading-relaxed text-fg-3">
                <FileText size={14} className="mt-0.5 shrink-0 text-gold-deep" />
                Full accounts and particulars are shared once your interest is registered.
              </p>
            </div>
          </aside>
        </section>

        {/* ── Trust band ────────────────────────────────────────────────── */}
        <section className="bg-ink text-white">
          <div className="mx-auto w-full max-w-6xl px-6 py-16 lg:py-20">
            <p className="max-w-3xl text-[24px] font-extrabold leading-snug tracking-[-0.02em] sm:text-[28px]">
              Requesting details commits you to nothing<span className="text-gold">.</span> It simply opens a
              conversation with the team that has guided practice sales since 1990.
            </p>
            <div className="mt-10 grid gap-8 border-t border-white/10 pt-10 sm:grid-cols-3">
              {[
                [ShieldCheck, "In strict confidence", "Your enquiry is never shared. Sellers' identities are protected the same way yours is."],
                [Landmark, "Independent since 1990", "The UK's leading independent dental practice sales agency — no corporate ties, no conflicts."],
                [KeyRound, "First-hand knowledge", "We know this practice, its numbers and its seller personally — ask us anything."],
              ].map(([Icon, title, body]) => {
                const I = Icon as typeof ShieldCheck;
                return (
                  <div key={String(title)}>
                    <I size={20} className="text-gold" strokeWidth={2} />
                    <p className="mt-3 text-[15px] font-extrabold tracking-tight">{String(title)}</p>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/55">{String(body)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Persuasion + form ─────────────────────────────────────────── */}
        <section id="enquire" className="bg-surface-2">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:py-24">
            <div className="min-w-0 lg:pt-4">
              <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-gold-deep">Request full details</p>
              <h2 className="mt-3 text-[28px] font-extrabold leading-tight tracking-[-0.02em] text-fg-1 sm:text-[34px]">
                Get the full picture of ref {practice.ref}
              </h2>
              <ul className="mt-7 space-y-4">
                {[
                  "The practice name and exact location",
                  "Full financials, accounts and particulars",
                  "A discreet viewing, arranged around you",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold">
                      <Check size={13} strokeWidth={3.5} className="text-ink" />
                    </span>
                    <span className="text-[15.5px] font-semibold leading-relaxed text-fg-1">{line}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-8 max-w-sm text-[14px] leading-relaxed text-fg-3">
                We respond personally within one working day. Prefer to talk it through first? Call the team on{" "}
                <span className="font-bold text-fg-1">0330 088 1156</span>.
              </p>
            </div>
            <div className="rounded-[24px] border border-line bg-white p-7 shadow-[0_20px_50px_-25px_rgba(15,15,10,0.25)] sm:p-9">
              <EnquiryForm token={token} practiceRef={practice.ref} />
            </div>
          </div>
        </section>
      </main>
    </Shell>
  );
}

function Shell({ children, stickyCta = false }: { children: React.ReactNode; stickyCta?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface-2">
      <header className="border-b border-white/10 bg-ink">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <span className="rounded-xl bg-gold px-3.5 py-1.5 text-sm font-extrabold tracking-tight text-ink">
            Frank Taylor &amp; Associates
          </span>
          <span className="hidden text-[12.5px] font-semibold tracking-wide text-white/50 sm:block">
            The UK's leading independent dental practice sales agency
          </span>
        </div>
      </header>
      {children}
      <footer className="bg-ink">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-start justify-between gap-6 px-6 py-10 pb-24 text-[12.5px] leading-relaxed text-white/50 sm:pb-10">
          <p className="max-w-xl">
            Frank Taylor &amp; Associates — guiding practice owners with integrity since 1990. All details are
            provided in strict confidence and do not form part of any contract.
          </p>
          <p className="font-semibold text-white/70">0330 088 1156</p>
        </div>
      </footer>
      {stickyCta ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-ink/95 p-3 backdrop-blur sm:hidden">
          <a
            href="#enquire"
            className="block rounded-xl bg-gold py-3.5 text-center text-[15px] font-extrabold text-ink"
          >
            Request Full Details
          </a>
        </div>
      ) : null}
    </div>
  );
}
