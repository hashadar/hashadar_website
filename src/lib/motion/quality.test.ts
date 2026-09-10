import { describe, expect, it } from "vitest";
import {
  WEBGL_DPR_CAP,
  clampDevicePixelRatio,
  dprCapForTier,
  resolveWebGLQuality,
} from "@/lib/motion/quality";

describe("resolveWebGLQuality", () => {
  it("returns off when prefers-reduced-motion is set", () => {
    expect(
      resolveWebGLQuality({
        prefersReducedMotion: true,
        coarsePointer: false,
        viewportWidth: 1440,
      }),
    ).toBe("off");
  });

  it("returns high on fine pointer and large viewport", () => {
    expect(
      resolveWebGLQuality({
        prefersReducedMotion: false,
        coarsePointer: false,
        viewportWidth: 1280,
      }),
    ).toBe("high");
  });

  it("returns medium for coarse pointer or small viewport alone", () => {
    expect(
      resolveWebGLQuality({
        prefersReducedMotion: false,
        coarsePointer: true,
        viewportWidth: 1280,
      }),
    ).toBe("medium");

    expect(
      resolveWebGLQuality({
        prefersReducedMotion: false,
        coarsePointer: false,
        viewportWidth: 375,
      }),
    ).toBe("medium");
  });

  it("returns low for coarse pointer and small viewport", () => {
    expect(
      resolveWebGLQuality({
        prefersReducedMotion: false,
        coarsePointer: true,
        viewportWidth: 390,
      }),
    ).toBe("low");
  });

  it("allows optional gpuTier to force low without raising tier", () => {
    expect(
      resolveWebGLQuality({
        prefersReducedMotion: false,
        coarsePointer: false,
        viewportWidth: 1440,
        gpuTier: "low",
      }),
    ).toBe("low");

    expect(
      resolveWebGLQuality({
        prefersReducedMotion: false,
        coarsePointer: true,
        viewportWidth: 390,
        gpuTier: "high",
      }),
    ).toBe("low");
  });
});

describe("DPR caps", () => {
  it("documents medium ≤ 1.5 and low = 1", () => {
    expect(WEBGL_DPR_CAP.medium).toBeLessThanOrEqual(1.5);
    expect(WEBGL_DPR_CAP.low).toBe(1);
    expect(WEBGL_DPR_CAP.high).toBeGreaterThanOrEqual(WEBGL_DPR_CAP.medium);
  });

  it("maps tiers to dprCapForTier", () => {
    expect(dprCapForTier("high")).toBe(2);
    expect(dprCapForTier("medium")).toBe(1.5);
    expect(dprCapForTier("low")).toBe(1);
    expect(dprCapForTier("off")).toBe(1);
  });

  it("clamps devicePixelRatio to the tier cap", () => {
    expect(clampDevicePixelRatio("medium", 3)).toBe(1.5);
    expect(clampDevicePixelRatio("low", 2)).toBe(1);
    expect(clampDevicePixelRatio("high", 1.25)).toBe(1.25);
  });
});
