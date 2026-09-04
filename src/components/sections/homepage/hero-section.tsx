"use client";

import dynamic from "next/dynamic";
import { Heading, Container } from "@/components/ui";
import { HeroFallback } from "@/components/ui/hero-webgl/hero-fallback";
import { motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import {
  fadeUpDistance,
  motionDurations,
  motionEasings,
  motionSprings,
} from "@/lib/motion/tokens";

const HeroWebGL = dynamic(
  () =>
    import("@/components/ui/hero-webgl/hero-webgl").then((mod) => ({
      default: mod.HeroWebGL,
    })),
  {
    ssr: false,
    loading: () => <HeroFallback />,
  },
);

interface HeroSectionProps {
  name: string;
  title: string;
}

export function HeroSection({ name, title }: HeroSectionProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLElement>(null);
  const scrollProgressRef = useRef(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    scrollProgressRef.current = value;
  });

  const y = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? ["0%", "0%"] : ["0%", "50%"],
  );
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.5],
    prefersReducedMotion ? [1, 1] : [1, 0],
  );

  const enterTransition = prefersReducedMotion
    ? { duration: 0 }
    : { ...motionSprings.heroEnter, duration: motionDurations.slow };

  return (
    <section
      ref={containerRef}
      id="hero"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--background)] pt-20"
    >
      <HeroWebGL scrollProgressRef={scrollProgressRef} />

      <Container className="hero-container relative z-10 w-full">
        <div className="w-full space-y-12 overflow-visible px-4 text-center sm:px-6 md:space-y-16 lg:space-y-20">
          {/* Brand name — hero-level DOM typography (LCP) */}
          <motion.div
            initial={
              prefersReducedMotion
                ? { opacity: 1 }
                : { opacity: 0, y: fadeUpDistance.lg * 2, rotateX: 15 }
            }
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={enterTransition}
            className="relative"
          >
            <div className="absolute -top-6 -left-6 h-16 w-16 bg-[var(--primary)] opacity-5 rotate-45 sm:-top-8 sm:-left-8 sm:h-24 sm:w-24" />
            <div className="absolute -right-3 -bottom-3 h-12 w-12 border-2 border-[var(--primary)] opacity-10 -rotate-12 sm:-right-4 sm:-bottom-4 sm:h-16 sm:w-16" />

            <motion.div
              style={{ y, opacity }}
              className="flex w-full justify-center overflow-visible"
            >
              <Heading size="hero" className="hero-text relative inline-block whitespace-nowrap">
                <span className="relative z-10">{name}</span>
                <motion.div
                  className="absolute -right-2 -bottom-2 h-8 w-8 bg-[var(--primary)] opacity-20 rotate-45"
                  initial={prefersReducedMotion ? { scale: 1 } : { scale: 0, rotate: 0 }}
                  animate={{ scale: 1, rotate: 45 }}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : {
                          delay: motionDurations.base,
                          duration: motionDurations.base,
                          ease: motionEasings.out,
                        }
                  }
                />
              </Heading>
            </motion.div>
          </motion.div>

          {/* Title */}
          <motion.div
            initial={
              prefersReducedMotion
                ? { opacity: 1 }
                : { opacity: 0, y: fadeUpDistance.lg, scale: 0.9 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : {
                    ...motionSprings.heroEnter,
                    delay: motionDurations.base,
                    duration: motionDurations.base,
                  }
            }
            className="relative px-4 sm:px-0"
          >
            <div className="absolute top-1/2 -left-6 h-px w-12 bg-[var(--primary)] opacity-30 -skew-y-12 sm:-left-8 sm:w-16" />

            <Heading
              size="sm"
              as="h2"
              className="relative capitalize tracking-[0.25em] text-[var(--primary)]"
            >
              <span className="relative z-10">{title}</span>
              <motion.div
                className="absolute -top-1 -right-1 h-3 w-3 border border-[var(--primary)] opacity-40 rotate-45"
                initial={prefersReducedMotion ? { scale: 1 } : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : {
                        delay: motionDurations.slow + 0.3,
                        duration: motionDurations.fast * 2,
                        ease: motionEasings.out,
                      }
                }
              />
            </Heading>
          </motion.div>

          {/* Scroll cue — no infinite bounce when reduced motion */}
          <motion.div
            initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
            animate={{ opacity: 1 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { delay: motionDurations.slow + 0.6, duration: motionDurations.base }
            }
            className="absolute bottom-6 left-1/2 -translate-x-1/2 sm:bottom-8"
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
            >
              <div className="h-8 w-px bg-[var(--primary)] opacity-30" />
              <div className="h-1 w-1 bg-[var(--primary)] rotate-45" />
            </motion.div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
