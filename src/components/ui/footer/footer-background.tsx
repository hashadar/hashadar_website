export function FooterBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="geometric-pattern opacity-[0.04]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent opacity-20" />
      <div className="absolute top-1/4 left-0 h-px w-16 -skew-x-12 bg-[var(--primary)] opacity-15" />
      <div className="absolute right-0 bottom-1/3 h-px w-24 skew-x-12 bg-[var(--primary)] opacity-10" />
    </div>
  );
}
