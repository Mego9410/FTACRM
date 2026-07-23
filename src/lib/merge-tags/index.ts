/**
 * Merge tags: `{{path.to.field}}` with optional fallback `{{field|fallback text}}`.
 * Rendering is pure; context builders decide what data is exposed — the
 * campaign context only ever includes marketing-safe practice fields, so a
 * confidential practice's name/address can't leak into bulk email.
 */

export type MergeContext = Record<string, unknown>;

const TAG_RE = /\{\{\s*([a-zA-Z0-9_.]+)\s*(?:\|([^}]*))?\}\}/g;

function lookupPath(ctx: MergeContext, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, ctx);
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * [SEV-LOW-01] Pass `{ escapeHtml: true }` when rendering into an HTML body so a
 * hostile contact/company name can't inject markup. Leave it off for plain-text
 * contexts (e.g. subject lines).
 */
export function renderMergeTags(
  template: string,
  ctx: MergeContext,
  opts?: { escapeHtml?: boolean },
): string {
  return template.replace(TAG_RE, (_m, path: string, fallback?: string) => {
    const value = lookupPath(ctx, path);
    const out = value === undefined || value === null || value === "" ? (fallback?.trim() ?? "") : String(value);
    return opts?.escapeHtml ? escapeHtml(out) : out;
  });
}

/** Tags present in a template (for validation / the composer's tag panel). */
export function extractTags(template: string): string[] {
  const tags = new Set<string>();
  for (const m of template.matchAll(TAG_RE)) tags.add(m[1]!);
  return [...tags];
}

/** Tags that would render empty (no value, no fallback) for a given context. */
export function unresolvedTags(template: string, ctx: MergeContext): string[] {
  const missing: string[] = [];
  for (const m of template.matchAll(TAG_RE)) {
    const value = lookupPath(ctx, m[1]!);
    if ((value === undefined || value === null || value === "") && m[2] === undefined) {
      missing.push(m[1]!);
    }
  }
  return [...new Set(missing)];
}

/* ── Context builders ───────────────────────────────────────────────── */

type ContactRow = {
  title?: string | null;
  first_name: string | null;
  last_name: string | null;
  company_name?: string | null;
  salutation?: string | null;
  email?: string | null;
};

type PracticeRow = {
  display_title: string;
  town: string | null;
  county: string | null;
  asking_price: number | string | null;
  price_prefix?: string | null;
  surgeries: number | null;
  name?: string | null;
  address_line1?: string | null;
  postcode?: string | null;
  public_token?: string | null;
};

type SenderRow = { full_name: string; email: string; signature_html?: string | null };

const gbp = (v: number | string | null | undefined) =>
  v === null || v === undefined || v === ""
    ? ""
    : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(Number(v));

export function buildContactContext(contact: ContactRow) {
  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.company_name || "";
  return {
    contact: {
      title: contact.title ?? "",
      first_name: contact.first_name ?? "",
      last_name: contact.last_name ?? "",
      full_name: fullName,
      company_name: contact.company_name ?? "",
      salutation: contact.salutation || contact.first_name || "",
      email: contact.email ?? "",
    },
  };
}

/**
 * Marketing-safe practice context: NEVER includes trading name, street
 * address or postcode — confidential listings depend on this.
 */
export function buildPracticeMarketingContext(practice: PracticeRow, opts?: { appUrl?: string }) {
  const priceLabel =
    practice.price_prefix === "offers_over"
      ? `Offers over ${gbp(practice.asking_price)}`
      : practice.price_prefix === "poa" || practice.asking_price == null
        ? "Price on application"
        : gbp(practice.asking_price);
  const appUrl = opts?.appUrl ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  return {
    practice: {
      display_title: practice.display_title,
      town: practice.town ?? "",
      county: practice.county ?? "",
      asking_price: gbp(practice.asking_price),
      price_label: priceLabel,
      surgeries: practice.surgeries ?? "",
      public_link: practice.public_token && appUrl ? `${appUrl}/p/${practice.public_token}` : "",
    },
  };
}

export function buildSenderContext(sender: SenderRow) {
  return {
    sender: {
      name: sender.full_name,
      email: sender.email,
      signature: sender.signature_html ?? "",
    },
  };
}

/** The tag palette shown in composers, grouped for the side panel. */
export const TAG_PALETTE: { group: string; tags: { tag: string; label: string }[] }[] = [
  {
    group: "Recipient",
    tags: [
      { tag: "{{contact.first_name|there}}", label: "First name (fallback: there)" },
      { tag: "{{contact.full_name}}", label: "Full name" },
      { tag: "{{contact.salutation}}", label: "Salutation" },
      { tag: "{{contact.company_name}}", label: "Company" },
    ],
  },
  {
    group: "Practice (marketing-safe)",
    tags: [
      { tag: "{{practice.display_title}}", label: "Marketing title" },
      { tag: "{{practice.price_label}}", label: "Price label" },
      { tag: "{{practice.town}}", label: "Town" },
      { tag: "{{practice.county}}", label: "County" },
      { tag: "{{practice.surgeries}}", label: "Surgeries" },
      { tag: "{{practice.public_link}}", label: "Public page link" },
    ],
  },
  {
    group: "Sender",
    tags: [
      { tag: "{{sender.name}}", label: "Your name" },
      { tag: "{{sender.email}}", label: "Your email" },
    ],
  },
];
