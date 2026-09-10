import { describe, expect, it } from "vitest";
import { fitClaimLockup } from "@/components/sections/homepage/fit-claim-lockup";

function mockLineWidth(line: HTMLElement, widthAtProbe: number, probe: number) {
  line.getBoundingClientRect = () => {
    const size = parseFloat(line.style.fontSize) || probe;
    const width = widthAtProbe * (size / probe);
    return {
      width,
      height: size * 0.8,
      top: 0,
      left: 0,
      bottom: size * 0.8,
      right: width,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    };
  };
}

function createLockup({
  availableWidth,
  availableHeight,
  hashaWidthAtProbe,
  darWidthAtProbe,
  probe = 80,
}: {
  availableWidth: number;
  availableHeight: number;
  hashaWidthAtProbe: number;
  darWidthAtProbe: number;
  probe?: number;
}) {
  const lockup = document.createElement("h1");
  const hasha = document.createElement("span");
  const dar = document.createElement("span");
  hasha.textContent = "hasha";
  dar.textContent = "dar";
  lockup.append(hasha, dar);

  Object.defineProperty(lockup, "clientWidth", { get: () => availableWidth });
  Object.defineProperty(lockup, "clientHeight", { get: () => availableHeight });
  Object.defineProperty(lockup, "scrollHeight", {
    get: () => {
      const size = parseFloat(hasha.style.fontSize) || probe;
      return size * 0.8 * 2;
    },
  });

  mockLineWidth(hasha, hashaWidthAtProbe, probe);
  mockLineWidth(dar, darWidthAtProbe, probe);

  return { lockup, hasha, dar };
}

describe("fitClaimLockup", () => {
  it("shares one font size and stays inside a landscape viewport without stretching dar", () => {
    const { lockup, hasha, dar } = createLockup({
      availableWidth: 800,
      availableHeight: 200,
      hashaWidthAtProbe: 400,
      darWidthAtProbe: 240,
    });

    fitClaimLockup(lockup);

    expect(hasha.style.fontSize).toBe(dar.style.fontSize);
    expect(lockup.scrollHeight).toBeLessThanOrEqual(lockup.clientHeight);
    expect(dar.getBoundingClientRect().width).toBeLessThan(lockup.clientWidth);
    expect(hasha.getBoundingClientRect().width).toBeLessThanOrEqual(lockup.clientWidth);
  });

  it("scales back down when the rendered glyphs are wider than the probe suggested", () => {
    const { lockup, hasha, dar } = createLockup({
      availableWidth: 800,
      availableHeight: 600,
      hashaWidthAtProbe: 400,
      darWidthAtProbe: 240,
    });

    hasha.getBoundingClientRect = () => {
      const size = parseFloat(hasha.style.fontSize) || 80;
      const linear = 400 * (size / 80);
      const width = size === 80 ? linear : linear * 1.19;
      return {
        width,
        height: size * 0.8,
        top: 0,
        left: 0,
        bottom: size * 0.8,
        right: width,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      };
    };

    fitClaimLockup(lockup);

    expect(hasha.style.fontSize).toBe(dar.style.fontSize);
    expect(hasha.getBoundingClientRect().width).toBeLessThanOrEqual(lockup.clientWidth);
  });
});
