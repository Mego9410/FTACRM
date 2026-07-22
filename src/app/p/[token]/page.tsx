import type { Metadata } from "next";
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
  headline_image_path?: string | null;
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
  available: { label: "Available", className: "bg-available-bg text-available-fg" },
  under_offer: { label: "Under offer", className: "bg-warn-bg text-warn" },
  sold_stc: { label: "Sold STC", className: "bg-warn-bg text-warn" },
  valuation: { label: "Coming to market", className: "bg-gold-tint text-gold-deep" },
  preparing: { label: "Coming to market", className: "bg-gold-tint text-gold-deep" },
};

export default async function PublicPracticePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const practice = await loadPractice(token);

  if (!practice || practice.archived_at || ["completed", "withdrawn"].includes(practice.status)) {
    return (
      <Shell>
        <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-5 py-20">
          <div className="w-full rounded-2xl border border-line bg-surface p-10 text-center shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-gold-deep">Frank Taylor &amp; Associates</p>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-fg-1">
              {practice ? "This practice is no longer available" : "This link isn't recognised"}
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-fg-2">
              {practice
                ? "It may have been sold or withdrawn from the market. We regularly bring similar practices to market — get in touch and we'll match you to the next one."
                : "The page you're after may have moved. If you received this link in an email, reply to it and we'll send you the latest details."}
            </p>
            <a
              href="https://ft-associates.com"
              className="mt-6 inline-block rounded-xl bg-gold px-6 py-3 text-sm font-extrabold text-ink transition-opacity hover:opacity-90"
            >
              Visit ft-associates.com
            </a>
          </div>
        </main>
      </Shell>
    );
  }

  const admin = createAdminClient();

  // Lookup values + optional photo, fetched tolerantly.
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

  const facts: { label: string; value: string | null }[] = [
    { label: "Asking price", value: price },
    { label: "Surgeries", value: practice.surgeries != null ? String(practice.surgeries) : null },
    { label: "Funding", value: funding },
    { label: "Tenure", value: tenure },
    { label: "Annual turnover", value: gbp(practice.annual_turnover) },
    { label: "EBITDA", value: gbp(practice.ebitda) },
    { label: "NHS contract value", value: gbp(practice.nhs_contract_value) },
    { label: "UDAs", value: practice.udas != null ? practice.udas.toLocaleString("en-GB") : null },
    { label: "Team size", value: practice.staff_count != null ? String(practice.staff_count) : null },
  ].filter((f) => f.value);

  const paragraphs = (practice.description ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <Shell>
      <main className="flex-1">
        {/* Hero */}
        <section className="border-b border-line bg-surface">
          <div className="mx-auto grid w-full max-w-5xl gap-10 px-5 py-12 lg:grid-cols-[1fr_360px] lg:py-16">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-deep">Dental practice for sale</p>
              <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-fg-1 sm:text-4xl">
                {practice.display_title}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {location ? (
                  <span className="rounded-full bg-surface-3 px-3 py-1 text-[13px] font-semibold text-fg-2">{location}</span>
                ) : null}
                {badge ? (
                  <span className={`rounded-full px-3 py-1 text-[13px] font-bold ${badge.className}`}>{badge.label}</span>
                ) : null}
                <span className="rounded-full bg-surface-3 px-3 py-1 text-[13px] font-semibold text-fg-3">Ref {practice.ref}</span>
              </div>
              <p className="mt-6 text-[32px] font-extrabold tracking-tight text-gold-deep">{price}</p>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-fg-2">
                Presented in strict confidence by Frank Taylor &amp; Associates. The practice name and exact
                location are withheld at this stage and shared once your interest is registered.
              </p>
              <a
                href="#enquire"
                className="mt-7 inline-block rounded-xl bg-gold px-7 py-3.5 text-[15px] font-extrabold text-ink shadow-sm transition-opacity hover:opacity-90"
              >
                Request Full Details
              </a>
            </div>
            <div className="overflow-hidden rounded-2xl border border-line bg-surface-2 shadow-sm">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="The practice" className="h-full max-h-[420px] w-full object-cover" />
              ) : (
                <div className="flex h-full min-h-[300px] items-center justify-center bg-gradient-to-br from-surface via-surface-2 to-gold-tint/40 p-6">
                  <div className="w-full max-w-[260px]">
                    <PracticeMap lat={practice.lat} lng={practice.lng} />
                    <p className="mt-3 text-center text-xs font-semibold text-fg-3">Approximate area shown</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Key facts */}
        <section className="mx-auto w-full max-w-5xl px-5 py-12">
          <h2 className="text-xl font-extrabold tracking-tight text-fg-1">The practice at a glance</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {facts.map((f) => (
              <div key={f.label} className="rounded-xl border border-line bg-surface px-4 py-3.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-fg-4">{f.label}</p>
                <p className="mt-1 text-[17px] font-extrabold tracking-tight text-fg-1">{f.value}</p>
              </div>
            ))}
          </div>
          {specialisms.length ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {specialisms.map((s) => (
                <span key={s} className="rounded-full bg-gold-tint px-3.5 py-1.5 text-[13px] font-bold text-gold-deep">
                  {s}
                </span>
              ))}
            </div>
          ) : null}
        </section>

        {/* Description */}
        {paragraphs.length ? (
          <section className="border-y border-line bg-surface">
            <div className="mx-auto w-full max-w-3xl px-5 py-12">
              <h2 className="text-xl font-extrabold tracking-tight text-fg-1">About this opportunity</h2>
              <div className="mt-4 space-y-4">
                {paragraphs.map((p, i) => (
                  <p key={i} className="text-[15px] leading-[1.75] text-fg-2">{p}</p>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* How it works */}
        <section className="mx-auto w-full max-w-5xl px-5 py-12">
          <h2 className="text-xl font-extrabold tracking-tight text-fg-1">What happens next</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {[
              ["Request details", "Tell us who you are below. It takes under a minute and everything stays confidential."],
              ["Receive the full picture", "We share the practice name, exact location, accounts and full particulars with you directly."],
              ["View and make your move", "We arrange a discreet viewing and guide you through offer, finance and completion."],
            ].map(([title, body], i) => (
              <div key={title} className="rounded-2xl border border-line bg-surface p-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold text-sm font-extrabold text-ink">
                  {i + 1}
                </span>
                <p className="mt-3 font-extrabold tracking-tight text-fg-1">{title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-2">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Enquiry form */}
        <section id="enquire" className="border-t border-line bg-surface-2">
          <div className="mx-auto w-full max-w-2xl px-5 py-14">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold-deep">No obligation, fully confidential</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-fg-1">Request more information</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-fg-2">
                Complete the form and the team will send you the full details of ref {practice.ref}.
              </p>
            </div>
            <div className="mt-8 rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
              <EnquiryForm token={token} practiceRef={practice.ref} />
            </div>
          </div>
        </section>
      </main>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface-2">
      <header className="border-b border-line bg-ink">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4">
          <span className="rounded-xl bg-gold px-3.5 py-1.5 text-sm font-extrabold tracking-tight text-ink">
            Frank Taylor &amp; Associates
          </span>
          <span className="hidden text-xs font-semibold text-white/60 sm:block">
            The UK's leading independent dental practice sales agency
          </span>
        </div>
      </header>
      {children}
      <footer className="bg-ink">
        <div className="mx-auto w-full max-w-5xl px-5 py-8 text-[12.5px] leading-relaxed text-white/55">
          <p>
            Frank Taylor &amp; Associates — guiding practice owners with integrity since 1990. All details are
            provided in strict confidence and do not form part of any contract.
          </p>
        </div>
      </footer>
    </div>
  );
}
