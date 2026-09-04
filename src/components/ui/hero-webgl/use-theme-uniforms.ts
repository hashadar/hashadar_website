"use client";

import { useEffect, useState } from "react";

export interface HeroThemeColors {
  primary: string;
  background: string;
  foreground: string;
}

const FALLBACK: HeroThemeColors = {
  primary: "#047857",
  background: "#ffffff",
  foreground: "#171717",
};

function readThemeColors(): HeroThemeColors {
  if (typeof window === "undefined") {
    return FALLBACK;
  }

  const styles = getComputedStyle(document.documentElement);
  return {
    primary: styles.getPropertyValue("--primary").trim() || FALLBACK.primary,
    background: styles.getPropertyValue("--background").trim() || FALLBACK.background,
    foreground: styles.getPropertyValue("--foreground").trim() || FALLBACK.foreground,
  };
}

/** Theme-aware CSS variables for R3F materials / clear colour. */
export function useThemeUniforms(): HeroThemeColors {
  const [colors, setColors] = useState<HeroThemeColors>(FALLBACK);

  useEffect(() => {
    const sync = () => setColors(readThemeColors());
    sync();

    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return colors;
}
