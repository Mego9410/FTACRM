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
const INK = "#0F0F0A";
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

export function renderLaunchEmail(practice: LaunchPractice): { subject: string; html: string } {
  const location = [practice.town, practice.county].filter(Boolean).join(", ");
  const subject = `New launch — ${practice.display_title}${location ? `, ${location}` : ""}`;

  const facts: [string, string | null][] = [
    ["Asking price", priceLabel(practice.asking_price, practice.price_prefix)],
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

  // Identity block — trading name + address only for non-confidential listings.
  const identity = practice.confidential
    ? ""
    : [practice.name, [practice.address_line1, practice.town, practice.postcode].filter(Boolean).join(", ")]
        .filter(Boolean)
        .map((line) => `<p style="margin:2px 0 0;font-size:14px;color:${FG2};">${esc(String(line))}</p>`)
        .join("");

  const description = practice.description
    ? practice.description
        .split(/\n{2,}/)
        .map((p) => `<p style="margin:0 0 14px;line-height:1.7;color:${FG2};">${esc(p).replace(/\n/g, "<br/>")}</p>`)
        .join("")
    : "";

  const html = `<!doctype html>
<html lang="en-GB">
<body style="margin:0;padding:0;background:#F4F4F3;font-family:'Hanken Grotesk',-apple-system,'Segoe UI',sans-serif;color:${FG2};font-size:16px;">
  <div style="max-width:620px;margin:0 auto;padding:24px 16px;">
    <div style="background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid ${LINE};">

      <div style="background:${INK};padding:28px 32px;">
        <span style="display:inline-block;background:${GOLD};color:${INK};font-weight:800;font-size:14px;letter-spacing:-0.01em;padding:7px 13px;border-radius:12px;">Frank Taylor &amp; Associates</span>
        <p style="margin:18px 0 0;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${GOLD};">New practice launch</p>
        <h1 style="margin:6px 0 0;font-size:26px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:#FFFFFF;">${esc(practice.display_title)}</h1>
        ${location ? `<p style="margin:6px 0 0;font-size:15px;color:#B6B6B2;">${esc(location)}</p>` : ""}
      </div>

      <div style="padding:32px;">
        <p style="margin:0 0 16px;line-height:1.65;">Dear {{contact.salutation|there}},</p>
        <p style="margin:0 0 20px;line-height:1.65;">A practice matching your registered requirements has just come to market. As a matched buyer you're receiving these details ahead of general release — in strict confidence.</p>

        ${identity ? `<div style="margin:0 0 18px;padding:14px 18px;border-left:3px solid ${GOLD};background:#FBF7EA;border-radius:0 12px 12px 0;"><p style="margin:0;font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:#8a6a1c;">Confidential — do not share</p>${identity}</div>` : ""}

        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:separate;border-spacing:0 10px;">
          ${factRows.join("")}
        </table>

        ${specialismPills}

        ${description ? `<div style="margin:24px 0 0;">${description}</div>` : ""}

        <div style="margin:28px 0 0;text-align:center;">
          <a href="mailto:{{sender.email}}?subject=${encodeURIComponent(`Interest in ${practice.ref} — ${practice.display_title}`)}"
             style="display:inline-block;background:${GOLD};color:${INK};font-weight:800;font-size:15px;text-decoration:none;padding:14px 30px;border-radius:14px;">
            Register your interest
          </a>
          <p style="margin:10px 0 0;font-size:13px;color:${FG3};">or simply reply to this email — quote ref ${esc(practice.ref)}</p>
        </div>

        <p style="margin:28px 0 0;line-height:1.5;color:#1A1A17;font-weight:600;">{{sender.full_name|The FTA team}}<br/><span style="font-weight:400;color:${FG3};font-size:14px;">Frank Taylor &amp; Associates</span></p>
      </div>

      <div style="background:#090909;color:#B6B6B2;padding:24px 32px;font-size:12.5px;line-height:1.6;">
        <p style="margin:0 0 8px;">Frank Taylor &amp; Associates — the UK's leading independent dental practice sales agency. Guiding practice owners with integrity since 1990.</p>
        <p style="margin:0;">These details are confidential and shared with you as a registered buyer. You're receiving this because you registered your interest with us.
        <a href="{{unsubscribe_url}}" style="color:${GOLD};">Unsubscribe</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}
