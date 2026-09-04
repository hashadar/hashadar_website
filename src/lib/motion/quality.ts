/**
 * WebGL quality tiers for the home hero Canvas (Phase 2+).
 *
 * DPR caps (passed as Canvas `dpr` max):
 * - high: ≤ 2
 * - medium: ≤ 1.5
 * - low: 1
 * - off: no WebGL (static fallback)
 *
 * Future: optional detect-gpu / GPU tier can refine medium↔low without changing this API.
 */

export type WebGLQualityTier = "high" | "medium" | "low" | "off";

/** CSS px width at or below which we treat the viewport as small. */
export const SMALL_VIEWPORT_MAX_PX = 768;

/** Max devicePixelRatio for each tier that still runs WebGL. */
export const WEBGL_DPR_CAP: Record<Exclude<WebGLQualityTier, "off">, number> = {
  high: 2,
  medium: 1.5,
  low: 1,
};

export interface WebGLQualityInput {
  prefersReducedMotion: boolean;
  /** `matchMedia("(pointer: coarse)").matches` */
  coarsePointer: boolean;
  viewportWidth: number;
  /**
   * Optional GPU tier from a future detect-gpu integration.
   * When set, `low` forces the WebGL tier down to `low` (never raises above heuristics).
   */
  gpuTier?: "high" | "medium" | "low";
}

export function resolveWebGLQuality(input: WebGLQualityInput): WebGLQualityTier {
  if (input.prefersReducedMotion) {
    return "off";
  }

  const smallViewport = input.viewportWidth <= SMALL_VIEWPORT_MAX_PX;
  let tier: Exclude<WebGLQualityTier, "off">;

  if (input.coarsePointer && smallViewport) {
    tier = "low";
  } else if (input.coarsePointer || smallViewport) {
    tier = "medium";
  } else {
    tier = "high";
  }

  // Hook for future detect-gpu: never upgrade past heuristic tier.
  if (input.gpuTier === "low" && tier !== "low") {
    return "low";
  }

  return tier;
}

/** Cap for Canvas `dpr`; `off` returns 1 (unused when WebGL is disabled). */
export function dprCapForTier(tier: WebGLQualityTier): number {
  if (tier === "off") {
    return 1;
  }
  return WEBGL_DPR_CAP[tier];
}

export function clampDevicePixelRatio(
  tier: WebGLQualityTier,
  devicePixelRatio: number,
): number {
  return Math.min(Math.max(devicePixelRatio, 1), dprCapForTier(tier));
}
