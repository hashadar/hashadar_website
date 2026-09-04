"use client";

import { Heading, Container } from "@/components/ui";
import { HeroFallback } from "@/components/ui/hero-media/hero-fallback";
import { HeroMedia } from "@/components/ui/hero-media/hero-media";
import type { PhotoItem } from "@/data/types";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import {
  fadeUpDistance,
  motionDurations,
  motionEasings,
  motionSprings,
} from "@/lib/motion/tokens";

interface HeroSectionProps {
  name: string;
  title: string;
  /** Site Content home photo; CSS fallback when null/undefined. */
  media?: PhotoItem | null;
}

export function HeroSection({ name, title, media }: HeroSectionProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const contentY = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? ["0%", "0%"] : ["0%", "28%"],
  );
  const contentOpacity = useTransform(
    scrollYProgress,
    [0, 0.55],
    prefersReducedMotion ? [1, 1] : [1, 0],
  );
  const mediaScale = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? [1, 1] : [1, 1.08],
  );

  const enterTransition = prefersReducedMotion
    ? { duration: 0 }
    : { ...motionSprings.heroEnter, duration: motionDurations.slow };

  return (
    <section
      ref={containerRef}
      id="hero"
      className="relative flex min-h-screen items-end justify-center overflow-hidden bg-[var(--background)] pb-16 pt-24 sm:items-center sm:pb-0 sm:pt-20"
    >
      {media ? (
        <HeroMedia
          media={media}
          scale={mediaScale}
          prefersReducedMotion={prefersReducedMotion}
        />
      ) : (
        <HeroFallback />
      )}

      <Container className="hero-container relative z-10 w-full">
        <motion.div
          style={{ y: contentY, opacity: contentOpacity }}
          className="mx-auto w-full max-w-5xl space-y-8 overflow-visible px-4 text-center sm:px-6 md:space-y-10"
        >
          <motion.div
            initial={
              prefersReducedMotion
                ? { opacity: 1 }
                : { opacity: 0, y: fadeUpDistance.lg }
            }
            animate={{ opacity: 1, y: 0 }}
            transition={enterTransition}
            className="relative"
          >
            <div className="mx-auto mb-6 h-px w-16 bg-[var(--primary)]/50 -skew-x-12 sm:mb-8" />
            <Heading size="hero" className="hero-text relative inline-block">
              <span className="relative z-10">{name}</span>
            </Heading>
          </motion.div>

          <motion.div
            initial={
              prefersReducedMotion
                ? { opacity: 1 }
                : { opacity: 0, y: fadeUpDistance.md }
            }
            animate={{ opacity: 1, y: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : {
                    ...motionSprings.heroEnter,
                    delay: motionDurations.base * 0.55,
                    duration: motionDurations.base,
                  }
            }
          >
            <Heading
              size="sm"
              as="h2"
              className="capitalize tracking-[0.28em] text-[var(--primary)]"
            >
              {title}
            </Heading>
            <div className="mx-auto mt-6 h-px w-12 bg-[var(--foreground)]/20 skew-x-12" />
          </motion.div>

          <motion.div
            initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
            animate={{ opacity: 1 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : {
                    delay: motionDurations.slow + 0.2,
                    duration: motionDurations.base,
                  }
            }
            className="flex justify-center pt-6 sm:pt-10"
          >
            <motion.div
              animate={prefersReducedMotion ? undefined : { y: [0, 8, 0] }}
              transition={
                prefersReducedMotion
                  ? undefined
                  : {
                      duration: motionDurations.slow + 0.8,
                      repeat: Infinity,
                      ease: motionEasings.inOut,
                    }
              }
              className="flex flex-col items-center space-y-2"
              aria-hidden="true"
            >
              <div className="h-8 w-px bg-[var(--primary)]/40" />
              <div className="h-1.5 w-1.5 rotate-45 bg-[var(--primary)]/70" />
            </motion.div>
          </motion.div>
        </motion.div>
      </Container>
    </section>
  );
}
