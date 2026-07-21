/**
 * Aspen brand marks, rebuilt as vector so they stay crisp at every size.
 * Navy wordmark with the light-blue swoosh through the "A", per the supplied logo.
 */

const NAVY = "#142a4d";
const SWOOSH = "#3d9be0";

/** Square "A + swoosh" mark — for favicons, the collapsed rail and tight spots. */
export function AspenMark({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      fill="none"
      role="img"
      aria-label="Aspen"
    >
      <path d="M24 101 L60 21 L96 101" stroke={NAVY} strokeWidth={15} strokeLinejoin="miter" strokeLinecap="butt" />
      <path d="M28 73 C46 91, 73 85, 97 57" stroke={SWOOSH} strokeWidth={9} strokeLinecap="round" />
    </svg>
  );
}

/**
 * Full "Aspen" wordmark. Rendered inline so the "spen" text picks up the live
 * Hanken Grotesk web font. Scale with a Tailwind height class (e.g. h-7 w-auto).
 */
export function AspenWordmark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 340 128"
      className={className}
      fill="none"
      role="img"
      aria-label="Aspen"
    >
      <path d="M14 104 L50 24 L86 104" stroke={NAVY} strokeWidth={15} strokeLinejoin="miter" strokeLinecap="butt" />
      <path d="M18 76 C36 94, 63 88, 87 60" stroke={SWOOSH} strokeWidth={9} strokeLinecap="round" />
      <text
        x="96"
        y="104"
        fontFamily="var(--font-hanken), -apple-system, 'Segoe UI', Arial, sans-serif"
        fontSize="96"
        fontWeight={700}
        letterSpacing="-3"
        fill={NAVY}
      >
        spen
      </text>
    </svg>
  );
}
