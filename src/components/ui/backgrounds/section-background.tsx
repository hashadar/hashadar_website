export type SectionBackgroundVariant = "marketing" | "photography" | "none";

interface SectionBackgroundProps {
  variant?: SectionBackgroundVariant;
}

export function SectionBackground({ variant = "marketing" }: SectionBackgroundProps) {
  if (variant === "none") {
    return null;
  }

  if (variant === "photography") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent opacity-20" />
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="geometric-pattern" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent opacity-25" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent opacity-15" />
      <div className="absolute inset-y-0 left-0 hidden w-px bg-gradient-to-b from-transparent via-[var(--primary)]/30 to-transparent md:block" />
    </div>
  );
}
