/**
 * Launch email — the auto-generated practice announcement sent to matched
 * buyers. Pure: builds subject + full inline-styled HTML from the practice
 * row in the FTA design system (gold #E4AD25, ink, Hanken Grotesk).
 *
 * Per-recipient personalisation stays as merge tags ({{contact.salutation}},
 * {{sender.*}}, {{unsubscribe_url}}) rendered at dispatch time.
 *
 * Confidentiality: the trading name and street address are only included when
 * the practice is NOT flagged confidential — otherwise buyers see the
 * anonymised marketing title and general area, per the listing rules.
 */

export type LaunchPractice = {
  ref: string;
  display_title: string;
  name: string | null;
  address_line1: string | null;
  town: string | null;
  county: string | null;
  postcode: string | null;
  confidential: boolean;
  asking_price: number | null;
  price_prefix: string;
  surgeries: number | null;
  udas: number | null;
  staff_count: number | null;
  annual_turnover: number | null;
  ebitda: number | null;
  nhs_contract_value: number | null;
  funding: string | null;
  tenure: string | null;
  specialisms: string[];
  description: string | null;
};

const GOLD = "#E4AD25";
const GOLD_DEEP = "#B4862A";
const TINT = "#FBF1D6";
const INK = "#0F0F0A";
const INK_DEEP = "#090909";
const FG1 = "#1A1A17";
const FG2 = "#5E5E5A";
const FG3 = "#8C8C88";
const LINE = "#E7E7E4";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const gbp = (v: number | null) =>
  v === null || v === undefined
    ? null
    : new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(v);

export function priceLabel(asking_price: number | null, price_prefix: string): string {
  if (asking_price == null || price_prefix === "poa") return "Price on application";
  const amount = gbp(asking_price)!;
  return price_prefix === "offers_over" ? `Offers over ${amount}` : amount;
}

function factCell(label: string, value: string): string {
  return `<td style="padding:12px 16px;border:1px solid ${LINE};border-radius:12px;background:#FAFAF9;">
    <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${FG3};">${esc(label)}</p>
    <p style="margin:4px 0 0;font-size:16px;font-weight:800;color:#1A1A17;letter-spacing:-0.01em;">${esc(value)}</p>
  </td>`;
}

export function renderLaunchEmail(
  practice: LaunchPractice,
  opts?: { publicUrl?: string | null },
): { subject: string; html: string } {
  const publicUrl = opts?.publicUrl ?? null;
  const location = [practice.town, practice.county].filter(Boolean).join(", ");
  const subject = `New launch — ${practice.display_title}${location ? `, ${location}` : ""}`;
  const heroPrice = priceLabel(practice.asking_price, practice.price_prefix);

  // Asking price now headlines the hero, so it's dropped from the fact grid.
  const facts: [string, string | null][] = [
    ["Surgeries", practice.surgeries != null ? String(practice.surgeries) : null],
    ["Funding", practice.funding],
    ["Tenure", practice.tenure],
    ["Annual turnover", gbp(practice.annual_turnover)],
    ["EBITDA", gbp(practice.ebitda)],
    ["NHS contract value", gbp(practice.nhs_contract_value)],
    ["UDAs", practice.udas != null ? practice.udas.toLocaleString("en-GB") : null],
    ["Staff", practice.staff_count != null ? String(practice.staff_count) : null],
  ];
  const present = facts.filter((f): f is [string, string] => f[1] !== null && f[1] !== "");
  const factRows: string[] = [];
  for (let i = 0; i < present.length; i += 2) {
    const pair = present.slice(i, i + 2);
    factRows.push(
      `<tr>${pair.map(([l, v]) => factCell(l, v)).join('<td style="width:10px;"></td>')}${pair.length === 1 ? "<td></td>" : ""}</tr>`,
    );
  }

  const specialismPills = practice.specialisms.length
    ? `<div style="margin:20px 0 0;">${practice.specialisms
        .map(
          (s) =>
            `<span style="display:inline-block;background:#F3EBD3;color:#8a6a1c;font-size:12.5px;font-weight:700;border-radius:999px;padding:5px 12px;margin:0 6px 6px 0;">${esc(s)}</span>`,
        )
        .join("")}</div>`
    : "";

  const description = practice.description
    ? practice.description
        .split(/\n{2,}/)
        .map((p) => `<p style="margin:0 0 14px;line-height:1.7;color:${FG2};">${esc(p).replace(/\n/g, "<br/>")}</p>`)
        .join("")
    : "";

  const ctaHref = publicUrl
    ? esc(publicUrl)
    : `mailto:{{sender.email}}?subject=${encodeURIComponent(`Interest in ${practice.ref} — ${practice.display_title}`)}`;

  // Advertising blocks carried over from the live FTA launch email — the
  // partner promos (Finance, Media) and the sell-side valuation prompt,
  // rebuilt as on-brand HTML cards rather than hosted promo images.
  const promo = (label: string, title: string, body: string, cta: string, href: string) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;margin:0 0 12px;">
      <tr><td style="border:1px solid ${LINE};border-radius:16px;background:#FFFFFF;padding:18px 20px;">
        <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:${GOLD_DEEP};">${esc(label)}</p>
        <p style="margin:5px 0 0;font-size:16px;font-weight:800;letter-spacing:-0.01em;color:${FG1};">${esc(title)}</p>
        <p style="margin:6px 0 0;font-size:13.5px;line-height:1.55;color:${FG2};">${esc(body)}</p>
        <a href="${href}" style="display:inline-block;margin:12px 0 0;font-size:13px;font-weight:800;color:${GOLD_DEEP};text-decoration:none;">${esc(cta)} &rarr;</a>
      </td></tr>
    </table>`;

  const socials = [
    ["Website", "https://www.ft-associates.com/"],
    ["Facebook", "https://www.facebook.com/FrankTaylorandAssociates"],
    ["LinkedIn", "https://uk.linkedin.com/company/frank-taylor-and-associates"],
    ["Instagram", "https://www.instagram.com/franktaylorassoc/"],
    ["YouTube", "https://www.youtube.com/@franktaylorassociates"],
  ]
    .map(([l, h]) => `<a href="${h}" style="color:#C9C9C4;text-decoration:none;font-weight:600;">${l}</a>`)
    .join('<span style="color:#4A4A46;"> &middot; </span>');

  const html = `<!doctype html>
<html lang="en-GB">
<body style="margin:0;padding:0;background:#F4F4F3;font-family:'Hanken Grotesk',-apple-system,'Segoe UI',sans-serif;color:${FG2};font-size:16px;">
  <div style="max-width:620px;margin:0 auto;padding:24px 16px;">
    <div style="background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid ${LINE};">

      <!-- Hero -->
      <div style="background:${INK};padding:30px 32px 34px;">
        <span style="display:inline-block;background:${GOLD};color:${INK};font-weight:800;font-size:14px;letter-spacing:-0.01em;padding:7px 13px;border-radius:12px;">Frank Taylor &amp; Associates</span>
        <p style="margin:20px 0 0;font-size:11.5px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:${GOLD};">Confidential sale &nbsp;&middot;&nbsp; <span style="color:#8C8C88;">Ref ${esc(practice.ref)}</span></p>
        <h1 style="margin:8px 0 0;font-size:30px;line-height:1.12;font-weight:800;letter-spacing:-0.02em;color:#FFFFFF;">${esc(practice.display_title)}<span style="color:${GOLD};">.</span></h1>
        ${location ? `<p style="margin:12px 0 0;"><span style="display:inline-block;background:rgba(255,255,255,0.1);color:#E6E6E2;font-size:13px;font-weight:600;border-radius:999px;padding:5px 13px;">${esc(location)}</span></p>` : ""}
        <p style="margin:22px 0 0;font-size:11.5px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#7C7C78;">Asking price</p>
        <p style="margin:2px 0 0;font-size:40px;line-height:1;font-weight:800;letter-spacing:-0.02em;color:${GOLD};">${esc(heroPrice)}</p>
      </div>

      <!-- Intro + facts -->
      <div style="padding:30px 32px;">
        <p style="margin:0 0 16px;line-height:1.65;color:${FG1};">Dear {{contact.salutation|there}},</p>
        <p style="margin:0 0 20px;line-height:1.65;">We&rsquo;re delighted to launch another practice to market today. A practice matching your registered requirements has just become available — as a matched buyer you&rsquo;re receiving these details ahead of general release, in strict confidence. The name and exact location are withheld at this stage; we&rsquo;ll share them once you register your interest.</p>

        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:separate;border-spacing:0 10px;">
          ${factRows.join("")}
        </table>

        ${specialismPills}

        ${description ? `<div style="margin:24px 0 0;">${description}</div>` : ""}

        <div style="margin:30px 0 4px;text-align:center;">
          <a href="${ctaHref}"
             style="display:inline-block;background:${GOLD};color:${INK};font-weight:800;font-size:15px;text-decoration:none;padding:15px 34px;border-radius:14px;">
            ${publicUrl ? "View Full Details" : "Register your interest"}
          </a>
          <p style="margin:12px 0 0;font-size:13px;color:${FG3};">Or reply to this email, or call <strong style="color:${FG1};">0330 088 1156</strong> &mdash; quote ref ${esc(practice.ref)}.</p>
        </div>

        <p style="margin:26px 0 0;line-height:1.5;color:${FG1};font-weight:600;">{{sender.full_name|The FTA team}}<br/><span style="font-weight:400;color:${FG3};font-size:14px;">Frank Taylor &amp; Associates</span></p>
      </div>

      <!-- Advertising -->
      <div style="background:#FAFAF9;border-top:1px solid ${LINE};padding:26px 32px;">
        <p style="margin:0 0 14px;font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:${FG3};">Here to help at every step</p>
        ${promo("Thinking of selling?", "Book a confidential valuation", "Considering selling your own practice? Arrange a no-obligation valuation with the UK’s leading dental practice sales agency.", "Book a valuation", "https://www.ft-associates.com/")}
        ${promo("FTA Finance", "Fund your acquisition", "FTA Finance arranges competitive practice-purchase funding, tailored to dentists and structured around your plans.", "Explore finance", "https://www.ftafinance.co.uk/")}
        ${promo("FTA Media", "Grow once you’re in", "FTA Media builds websites, branding and marketing that bring new patients through the door.", "See FTA Media", "https://www.fta.media/")}
      </div>

      <!-- Footer -->
      <div style="background:${INK_DEEP};color:#B6B6B2;padding:26px 32px;font-size:12.5px;line-height:1.65;">
        <p style="margin:0 0 12px;">${socials}</p>
        <p style="margin:0 0 8px;">Frank Taylor &amp; Associates &mdash; the UK&rsquo;s leading independent dental practice sales agency. Guiding practice owners with integrity since 1988.</p>
        <p style="margin:0 0 8px;">1 Bradmore Building, Bradmore Green, Brookmans Park, Hertfordshire AL9 7QR &nbsp;&middot;&nbsp; 0330 088 1156 &nbsp;&middot;&nbsp; www.ft-associates.com</p>
        <p style="margin:0 0 8px;color:#7C7C78;">These details are confidential and shared with you as a registered buyer, because you registered your interest with us. <a href="{{unsubscribe_url}}" style="color:${GOLD};">Unsubscribe</a></p>
        <p style="margin:0;color:#5C5C58;font-size:11.5px;">Frank Taylor &amp; Associates Limited &middot; Registered in England No. 4028278 &middot; Registered office: 1 Bradmore Building, Bradmore Green, Brookmans Park, Hertfordshire AL9 7QR.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}
