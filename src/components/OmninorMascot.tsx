export default function OmninorMascot({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="15" y="30" width="70" height="55" rx="24" fill="#76B900" />
      <line x1="50" y1="30" x2="50" y2="12" stroke="#76B900" strokeWidth="8" strokeLinecap="round" />
      <circle cx="50" cy="12" r="8" fill="#76B900" />
      <rect x="27" y="45" width="46" height="26" rx="12" fill="#111111" />
      <path d="M 36 56 Q 40 50 44 56" fill="none" stroke="#76B900" strokeWidth="4" strokeLinecap="round" />
      <path d="M 56 56 Q 60 50 64 56" fill="none" stroke="#76B900" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
