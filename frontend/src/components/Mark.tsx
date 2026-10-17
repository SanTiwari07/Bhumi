/**
 * Bhumi (भूमि) mark: three contour lines from a survey sheet and the marigold seal point,
 * the one place on the land that has been checked and recorded.
 */
export function Mark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" className="mark">
      <rect width="32" height="32" rx="7" fill="#2E5296" />
      <path d="M5 13.5C9.5 9 16 7.5 27 8.5" stroke="#C9D6EE" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5 19.5C10 15 17 13.5 27 14.5" stroke="#E6ECF7" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5 25.5C10.5 21 18 19.5 27 20.5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="20.5" cy="22.6" r="3.4" fill="#E3A008" stroke="#2E5296" strokeWidth="1.4" />
    </svg>
  );
}
