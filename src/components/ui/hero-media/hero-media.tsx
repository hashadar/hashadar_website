"use client";

import Image from "next/image";
import { motion, type MotionValue } from "framer-motion";
import type { PhotoItem } from "@/data/types";

export interface HeroMediaProps {
  media: PhotoItem;
  /** Subtle scale driven by scroll; ignored when reduced motion. */
  scale?: MotionValue<number> | number;
  prefersReducedMotion: boolean;
}

/**
 * Full-bleed home photo atmosphere. Brand typography stays in the DOM above.
 */
export function HeroMedia({ media, scale, prefersReducedMotion }: HeroMediaProps) {
  const image = (
    <Image
      src={media.src}
      alt=""
      fill
      sizes="100vw"
      className="object-cover object-center"
      // Prefer text LCP; allow progressive photo without stealing the element.
      priority={false}
      quality={85}
    />
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {prefersReducedMotion || scale === undefined ? (
        <div className="absolute inset-0">{image}</div>
      ) : (
        <motion.div className="absolute inset-0 origin-center" style={{ scale }}>
          {image}
        </motion.div>
      )}

      {/* Theme-aware scrims for type readability */}
      <div className="absolute inset-0 bg-[var(--background)]/35 dark:bg-[var(--background)]/55" />
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--background)]/50 via-transparent to-[var(--background)]/85" />
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--background)]/25 via-transparent to-[var(--background)]/25" />
    </div>
  );
}
