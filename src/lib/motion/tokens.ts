/**
 * Shared motion tokens for Framer Motion (and later R3F choreography).
 * Distances match MotionReveal fade-up / clip-up / slide-in offsets.
 */

export const motionDurations = {
  fast: 0.3,
  /** Aligns with MotionReveal fade duration. */
  base: 0.8,
  slow: 1.2,
} as const;

export type MotionDuration = keyof typeof motionDurations;

export const motionEasings = {
  out: "easeOut",
  inOut: "easeInOut",
} as const;

export type MotionEasing = keyof typeof motionEasings;

/** Spring presets for hero enter and reveal-style motion. */
export const motionSprings = {
  heroEnter: {
    type: "spring" as const,
    damping: 25,
    stiffness: 80,
  },
  reveal: {
    type: "spring" as const,
    damping: 28,
    stiffness: 120,
  },
} as const;

export type MotionSpring = keyof typeof motionSprings;

/** Per-item delay (seconds) for staggered lists/grids. */
export const motionStagger = {
  step: 0.08,
} as const;

/** Fade-up travel distances in px — matches MotionReveal (`sm` / `md` / `lg`). */
export const fadeUpDistance = {
  sm: 20,
  md: 30,
  lg: 50,
} as const;

export type FadeUpDistance = keyof typeof fadeUpDistance;
