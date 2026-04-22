export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="14,1 25,7.5 25,20.5 14,27 3,20.5 3,7.5" fill="none" stroke="#38bdf8" strokeWidth="1"/>
      <polygon points="14,5 22,9.5 22,18.5 14,23 6,18.5 6,9.5" fill="rgba(56,189,248,0.06)" stroke="rgba(56,189,248,0.3)" strokeWidth="0.5"/>
      <path d="M11 13.5V12C11 10.34 12.34 9 14 9C15.66 9 17 10.34 17 12V13.5" stroke="#38bdf8" strokeWidth="1.2" strokeLinecap="round"/>
      <rect x="10.5" y="13.5" width="7" height="5" rx="1" fill="#38bdf8" opacity="0.9"/>
      <circle cx="14" cy="15.5" r="0.9" fill="#04060a"/>
      <rect x="13.5" y="16.2" width="1" height="1.3" rx="0.5" fill="#04060a"/>
    </svg>
  );
}
