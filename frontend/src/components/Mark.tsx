/**
 * Bhumi (भूमि) emblem: a living botanical leaf vein fused with a cryptographic
 * Merkle verification node in deep forest canopy (#1B4332), chlorophyll green (#2D6A4F),
 * and warm terracotta soil (#BC6C25).
 */
export function Mark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" className="mark">
      <rect width="32" height="32" rx="8" fill="#1B4332" />
      <path
        d="M8 23.5C8 14.5 14.5 8 23.5 8C23.5 17 17 23.5 8 23.5Z"
        fill="#2D6A4F"
        stroke="#74C69D"
        strokeWidth="1.6"
      />
      <path d="M8.5 23L21 10.5" stroke="#D8F3DC" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M13 18.5L13 13.5M17.5 14L22 14" stroke="#95D5B2" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="21" cy="10.5" r="2.5" fill="#BC6C25" stroke="#FAFCF8" strokeWidth="1.2" />
      <circle cx="13" cy="18.5" r="1.7" fill="#D8F3DC" />
    </svg>
  );
}
