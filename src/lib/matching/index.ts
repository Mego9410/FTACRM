import { regionMatchesCounty } from "./regions";

/**
 * Pure matching + scoring. All rules run in one place so behaviour is
 * unit-tested and identical everywhere it's used. Unspecified buyer
 * constraints pass; specified constraints must all hold.
 */

export const PRICE_TOLERANCE = 0.1; // ±10% band around the buyer's range

export type MatchPractice = {
  id: string;
  asking_price: number | null;
  lat: number | null;
  lng: number | null;
  county: string | null;
  town: string | null;
  funding_type_id: string | null;
  tenure_type_id: string | null;
  specialism_ids: string[];
  surgeries: number | null;
  annual_turnover: number | null;
};

export type MatchBuyer = {
  contact_id: string;
  min_price: number | null;
  max_price: number | null;
  specialism_ids: string[];
  funding_type_ids: string[];
  tenure_type_ids: string[];
  min_surgeries: number | null;
  min_annual_turnover: number | null;
  areas: {
    lat: number | null;
    lng: number | null;
    radius_miles: number | null;
    region: string | null;
    label: string;
  }[];
  last_contacted_at?: string | null;
  temperature?: string | null;
};

export type MatchResult = {
  matches: boolean;
  score: number; // 0–100, only meaningful when matches
  facets: string[]; // human-readable reasons, e.g. "Area: Manchester (12 mi)"
};

export function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const a =
    Math.sin(toRad(lat2 - lat1) / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(toRad(lng2 - lng1) / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.min(1, Math.sqrt(a)));
}

function priceCheck(practice: MatchPractice, buyer: MatchBuyer): { pass: boolean; exact: boolean } {
  if (practice.asking_price == null) return { pass: true, exact: false };
  const { min_price, max_price } = buyer;
  if (min_price == null && max_price == null) return { pass: true, exact: false };
  const price = Number(practice.asking_price);
  const exactMin = min_price == null || price >= Number(min_price);
  const exactMax = max_price == null || price <= Number(max_price);
  if (exactMin && exactMax) return { pass: true, exact: true };
  const tolMin = min_price == null || price >= Number(min_price) * (1 - PRICE_TOLERANCE);
  const tolMax = max_price == null || price <= Number(max_price) * (1 + PRICE_TOLERANCE);
  return { pass: tolMin && tolMax, exact: false };
}

function areaCheck(
  practice: MatchPractice,
  buyer: MatchBuyer,
): { pass: boolean; facet: string | null; distance: number | null } {
  if (buyer.areas.length === 0) return { pass: true, facet: null, distance: null };
  let best: { facet: string; distance: number | null } | null = null;
  for (const area of buyer.areas) {
    if (area.region) {
      if (regionMatchesCounty(area.region, practice.county, practice.town)) {
        best ??= { facet: `Area: ${area.region}`, distance: null };
      }
    } else if (area.lat != null && area.lng != null && area.radius_miles != null) {
      if (practice.lat == null || practice.lng == null) continue;
      const d = haversineMiles(area.lat, area.lng, practice.lat, practice.lng);
      if (d <= Number(area.radius_miles)) {
        if (!best || (best.distance !== null && d < best.distance)) {
          best = { facet: `Area: ${area.label} (${Math.round(d)} mi)`, distance: d };
        }
      }
    }
  }
  return best ? { pass: true, facet: best.facet, distance: best.distance } : { pass: false, facet: null, distance: null };
}

function setCheck(practiceValue: string | null, buyerSet: string[]): boolean {
  if (buyerSet.length === 0) return true;
  if (!practiceValue) return false;
  return buyerSet.includes(practiceValue);
}

function overlapCheck(practiceSet: string[], buyerSet: string[]): boolean {
  if (buyerSet.length === 0) return true;
  if (practiceSet.length === 0) return false;
  return practiceSet.some((v) => buyerSet.includes(v));
}

export function matchBuyerToPractice(
  practice: MatchPractice,
  buyer: MatchBuyer,
  lookupLabel?: (id: string) => string | undefined,
): MatchResult {
  const facets: string[] = [];

  const price = priceCheck(practice, buyer);
  if (!price.pass) return { matches: false, score: 0, facets: [] };

  const area = areaCheck(practice, buyer);
  if (!area.pass) return { matches: false, score: 0, facets: [] };

  if (!setCheck(practice.funding_type_id, buyer.funding_type_ids)) return { matches: false, score: 0, facets: [] };
  if (!setCheck(practice.tenure_type_id, buyer.tenure_type_ids)) return { matches: false, score: 0, facets: [] };
  if (!overlapCheck(practice.specialism_ids, buyer.specialism_ids)) return { matches: false, score: 0, facets: [] };

  if (buyer.min_surgeries != null && (practice.surgeries ?? 0) < buyer.min_surgeries) {
    return { matches: false, score: 0, facets: [] };
  }
  if (
    buyer.min_annual_turnover != null &&
    (practice.annual_turnover == null || Number(practice.annual_turnover) < Number(buyer.min_annual_turnover))
  ) {
    return { matches: false, score: 0, facets: [] };
  }

  // ── Scoring: base 50, weighted boosts, distance decay ──
  let score = 50;
  if (price.exact) {
    score += 15;
    facets.push("Price in range");
  } else {
    score += 5;
    facets.push("Price within 10%");
  }
  if (area.facet) {
    facets.push(area.facet);
    if (area.distance !== null) {
      const areaRadius = 50;
      score += Math.round(15 * Math.max(0, 1 - area.distance / areaRadius));
    } else {
      score += 8;
    }
  }
  const label = (id: string) => lookupLabel?.(id) ?? "match";
  if (buyer.funding_type_ids.length > 0 && practice.funding_type_id) {
    score += 8;
    facets.push(label(practice.funding_type_id));
  }
  if (buyer.tenure_type_ids.length > 0 && practice.tenure_type_id) {
    score += 4;
    facets.push(label(practice.tenure_type_id));
  }
  if (buyer.specialism_ids.length > 0) {
    score += 4;
    const hit = practice.specialism_ids.find((s) => buyer.specialism_ids.includes(s));
    if (hit) facets.push(label(hit));
  }
  if (buyer.temperature === "hot") score += 6;
  else if (buyer.temperature === "warm") score += 3;
  if (buyer.last_contacted_at) {
    const days = (Date.now() - new Date(buyer.last_contacted_at).getTime()) / 86_400_000;
    if (days <= 30) score += 4;
  }

  return { matches: true, score: Math.min(100, score), facets };
}
