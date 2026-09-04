"use client";

/**
 * Static / CSS atmosphere when WebGL is off, reduced-motion, or Canvas fails.
 * Mirrors the signature angular mass / light-cut language without motion.
 */
export function HeroFallback() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <div className="geometric-pattern opacity-[0.08]" />

      {/* Broad structural planes */}
      <div className="absolute top-[12%] -right-[8%] h-[42vmin] w-[42vmin] border border-[var(--primary)]/25 rotate-45" />
      <div className="absolute top-[18%] right-[6%] h-[22vmin] w-[22vmin] bg-[var(--primary)]/10 rotate-45" />
      <div className="absolute -bottom-[6%] -left-[10%] h-[48vmin] w-[48vmin] border-2 border-[var(--foreground)]/10 -rotate-12" />

      {/* Light-cut blades */}
      <div className="absolute top-[8%] left-[42%] h-[70vmin] w-px origin-top rotate-[28deg] bg-gradient-to-b from-[var(--primary)]/50 via-[var(--primary)]/20 to-transparent" />
      <div className="absolute top-[20%] left-[58%] h-[45vmin] w-px origin-top -rotate-[18deg] bg-gradient-to-b from-[var(--primary)]/35 via-[var(--primary)]/10 to-transparent" />
      <div className="absolute top-[28%] left-[28%] h-[32vmin] w-px origin-top rotate-[52deg] bg-gradient-to-b from-[var(--foreground)]/20 to-transparent" />

      {/* Angular mass cluster */}
      <div className="absolute top-[34%] right-[22%] h-16 w-16 bg-[var(--primary)]/20 rotate-45 sm:h-24 sm:w-24" />
      <div className="absolute top-[42%] right-[18%] h-10 w-10 border-2 border-[var(--primary)]/35 rotate-12 sm:h-14 sm:w-14" />
      <div className="absolute bottom-[24%] left-[14%] h-12 w-20 bg-[var(--foreground)]/10 -rotate-6 sm:h-16 sm:w-28" />
      <div className="absolute bottom-[30%] left-[20%] h-5 w-5 bg-[var(--primary)]/25 rotate-45" />

      <div className="absolute inset-x-0 top-1/3 h-px bg-gradient-to-r from-transparent via-[var(--primary)]/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--background)]/70" />
    </div>
  );
}
