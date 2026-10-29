/** Isotipo de zcorp-stack: tres capas apiladas (el «stack»). */
export function Isotipo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={`shrink-0 ${className}`} aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#1f9d57" />
      <path d="M16 7 6 12l10 5 10-5z" fill="#ffffff" />
      <path d="m6 16 10 5 10-5" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinejoin="round" opacity=".8" />
      <path d="m6 20 10 5 10-5" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinejoin="round" opacity=".55" />
    </svg>
  );
}
