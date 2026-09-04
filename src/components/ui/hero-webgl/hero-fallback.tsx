"use client";

/**
 * Static / CSS atmosphere when WebGL is off, reduced-motion, or Canvas fails.
 * Intentional angular composition — not an empty shell.
 */
export function HeroFallback() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <div className="geometric-pattern opacity-10" />

      <div className="absolute top-1/4 left-0 h-px w-full bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent opacity-25" />
      <div className="absolute top-1/2 right-[12%] h-40 w-px bg-gradient-to-b from-transparent via-[var(--primary)] to-transparent opacity-20" />
      <div className="absolute bottom-[28%] left-0 h-px w-28 bg-[var(--primary)] opacity-35 -skew-x-12" />
      <div className="absolute top-[18%] right-[14%] h-px w-24 bg-[var(--foreground)] opacity-10 skew-x-12" />

      {/* Angular mass — static depth cues (no looping motion) */}
      <div className="absolute top-[16%] right-[10%] h-20 w-20 border border-[var(--primary)] opacity-20 rotate-45 sm:h-28 sm:w-28" />
      <div className="absolute top-[22%] right-[14%] h-10 w-10 bg-[var(--primary)] opacity-10 rotate-45 sm:h-14 sm:w-14" />
      <div className="absolute bottom-[22%] left-[8%] h-16 w-16 border-2 border-[var(--foreground)] opacity-10 -rotate-12 sm:h-24 sm:w-24" />
      <div className="absolute bottom-[28%] left-[12%] h-6 w-6 bg-[var(--primary)] opacity-15 rotate-12" />
      <div className="absolute top-[38%] left-[18%] h-3 w-3 border border-[var(--primary)] opacity-25 rotate-45" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--background)] opacity-40" />
    </div>
  );
}
