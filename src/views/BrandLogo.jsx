export default function BrandLogo({ compact = false }) {
  return (
    <span className={`brand-lockup${compact ? " brand-lockup-compact" : ""}`}>
      <svg className="brand-logo-icon" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M7 39h34M11 39V20h6v19m7 0V12h6v27m7 0V20h6v19M20 39V25h8v14M23 12V7h8v5" />
        <path d="M24 25c0-4 6-4 6 0" />
        <path className="brand-logo-spark" d="M13 10h4m-2-2v4m15-5h4m-2-2v4m7 8h3m-1.5-1.5v3" />
      </svg>
      <span className="brand-name">STAY<span>ORA</span></span>
    </span>
  );
}
