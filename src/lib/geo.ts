/**
 * UK postcode geocoding via postcodes.io (free, no key). Wrapped so a paid
 * provider can replace it without touching callers. Failures return null —
 * geocoding is best-effort and never blocks a save.
 */

export type GeoPoint = { lat: number; lng: number };

export async function geocodePostcode(postcode: string): Promise<GeoPoint | null> {
  const cleaned = postcode.trim().replace(/\s+/g, "");
  if (!/^[A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2}$/.test(postcode.trim())) return null;
  try {
    const res = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(cleaned)}`,
      { signal: AbortSignal.timeout(4000), next: { revalidate: 86400 } },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      result?: { latitude: number | null; longitude: number | null };
    };
    if (json.result?.latitude == null || json.result?.longitude == null) return null;
    return { lat: json.result.latitude, lng: json.result.longitude };
  } catch {
    return null;
  }
}

/** Free-text place search (town/area names) → best-match point. */
export async function geocodePlace(query: string): Promise<(GeoPoint & { label: string }) | null> {
  try {
    // postcodes.io "places" covers UK settlements.
    const res = await fetch(
      `https://api.postcodes.io/places?q=${encodeURIComponent(query)}&limit=1`,
      { signal: AbortSignal.timeout(4000), next: { revalidate: 86400 } },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      result?: { name_1: string; latitude: number | null; longitude: number | null }[];
    };
    const hit = json.result?.[0];
    if (!hit || hit.latitude == null || hit.longitude == null) return null;
    return { label: hit.name_1, lat: hit.latitude, lng: hit.longitude };
  } catch {
    return null;
  }
}

export const UK_REGIONS = [
  "North East",
  "North West",
  "Yorkshire and the Humber",
  "East Midlands",
  "West Midlands",
  "East of England",
  "London",
  "South East",
  "South West",
  "Wales",
] as const;
