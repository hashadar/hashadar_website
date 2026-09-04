import { describe, expect, it } from "vitest";
import {
  fadeUpDistance,
  motionDurations,
  motionEasings,
  motionSprings,
  motionStagger,
} from "@/lib/motion/tokens";

describe("motion tokens", () => {
  it("exposes fast / base / slow durations", () => {
    expect(motionDurations.fast).toBeLessThan(motionDurations.base);
    expect(motionDurations.base).toBe(0.8);
    expect(motionDurations.slow).toBeGreaterThan(motionDurations.base);
  });

  it("exposes Framer-compatible easing names", () => {
    expect(motionEasings.out).toBe("easeOut");
    expect(motionEasings.inOut).toBe("easeInOut");
  });

  it("exposes hero enter and reveal spring presets", () => {
    expect(motionSprings.heroEnter).toMatchObject({
      type: "spring",
      damping: 25,
      stiffness: 80,
    });
    expect(motionSprings.reveal.type).toBe("spring");
  });

  it("exposes a positive stagger step", () => {
    expect(motionStagger.step).toBeGreaterThan(0);
  });

  it("aligns fade-up distances with MotionReveal (20 / 30 / 50)", () => {
    expect(fadeUpDistance).toEqual({ sm: 20, md: 30, lg: 50 });
  });
});
