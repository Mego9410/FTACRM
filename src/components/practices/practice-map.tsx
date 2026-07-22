import { projectPin, UK_MAP_PATHS, UK_MAP_VIEWBOX } from "@/lib/uk-map";

/** Shared id for the map geometry, so many thumbnails can reference one copy. */
export const UK_MAP_SYMBOL_ID = "fta-uk-map-paths";

const Pin = () => (
  <g>
    <path
      d="M0 0 C-7 -12 -11 -17 -11 -24 A11 11 0 1 1 11 -24 C11 -17 7 -12 0 0 Z"
      fill="#E4AD25"
      stroke="#0F0F0A"
      strokeWidth={1}
    />
    <circle cx={0} cy={-24} r={4.5} fill="#0F0F0A" />
  </g>
);

/**
 * Render the map geometry once per page (hidden). Cards then reference it with
 * <PracticeMapUse>, so the ~22 KB of paths ships a single time however many
 * thumbnails are shown.
 */
export function PracticeMapDefs() {
  return (
    <svg width={0} height={0} className="absolute" aria-hidden focusable="false">
      <defs>
        <g id={UK_MAP_SYMBOL_ID}>
          {UK_MAP_PATHS.map((d, i) => (
            <path key={i} d={d} fill="#D9D9D7" stroke="#FBFBFA" strokeWidth={0.8} />
          ))}
        </g>
      </defs>
    </svg>
  );
}

/** Lightweight map thumbnail that reuses the shared <defs> (needs <PracticeMapDefs/> on the page). */
export function PracticeMapUse({
  lat,
  lng,
  className,
}: {
  lat: number | null;
  lng: number | null;
  className?: string;
}) {
  const pin = lat != null && lng != null ? projectPin(lng, lat) : null;
  return (
    <svg viewBox={UK_MAP_VIEWBOX} className={className} role="img" aria-label="Location map" preserveAspectRatio="xMidYMid meet">
      <use href={`#${UK_MAP_SYMBOL_ID}`} />
      {pin ? <g transform={`translate(${pin.x} ${pin.y})`}><Pin /></g> : null}
    </svg>
  );
}

/**
 * Generated headline fallback — a greyscale England & Wales map with a gold pin
 * at the practice's coordinates. Pure SVG (no network, no client JS); the pin
 * is placed by the same projection the map paths were built with.
 */
export function PracticeMap({
  lat,
  lng,
  className,
}: {
  lat: number | null;
  lng: number | null;
  className?: string;
}) {
  const pin = lat != null && lng != null ? projectPin(lng, lat) : null;
  return (
    <svg
      viewBox={UK_MAP_VIEWBOX}
      className={className}
      role="img"
      aria-label="Practice location map"
      preserveAspectRatio="xMidYMid meet"
    >
      {UK_MAP_PATHS.map((d, i) => (
        <path key={i} d={d} fill="#D9D9D7" stroke="#FBFBFA" strokeWidth={0.8} />
      ))}
      {pin ? <g transform={`translate(${pin.x} ${pin.y})`}><Pin /></g> : null}
    </svg>
  );
}
