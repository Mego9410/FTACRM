import { projectPin, UK_MAP_PATHS, UK_MAP_VIEWBOX } from "@/lib/uk-map";

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
      {pin ? (
        <g transform={`translate(${pin.x} ${pin.y})`}>
          <path
            d="M0 0 C-7 -12 -11 -17 -11 -24 A11 11 0 1 1 11 -24 C11 -17 7 -12 0 0 Z"
            fill="#E4AD25"
            stroke="#0F0F0A"
            strokeWidth={1}
          />
          <circle cx={0} cy={-24} r={4.5} fill="#0F0F0A" />
        </g>
      ) : null}
    </svg>
  );
}
