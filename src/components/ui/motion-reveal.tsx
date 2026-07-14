"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

export type MotionRevealVariant = "fade-up" | "fade" | "slide-in" | "none";
export type MotionRevealDistance = "sm" | "md" | "lg";

export interface MotionRevealProps {
  children: ReactNode;
  variant?: MotionRevealVariant;
  delay?: number;
  className?: string;
  /** When true (default), reveal on scroll with whileInView; otherwise animate on mount. */
  inView?: boolean;
  distance?: MotionRevealDistance;
}

const FADE_UP_DISTANCE: Record<MotionRevealDistance, number> = {
  sm: 20,
  md: 30,
  lg: 50,
};

export function MotionReveal({
  children,
  variant = "fade-up",
  delay = 0,
  className,
  inView = true,
  distance = "md",
}: MotionRevealProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (variant === "none" || prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  const initial =
    variant === "fade"
      ? { opacity: 0 }
      : variant === "slide-in"
        ? { opacity: 0, x: -50 }
        : { opacity: 0, y: FADE_UP_DISTANCE[distance] };

  const visible =
    variant === "fade"
      ? { opacity: 1 }
      : variant === "slide-in"
        ? { opacity: 1, x: 0 }
        : { opacity: 1, y: 0 };

  const transition = { duration: 0.8, delay, ease: "easeOut" as const };

  if (inView) {
    return (
      <motion.div
        className={className}
        initial={initial}
        whileInView={visible}
        transition={transition}
        viewport={{ once: true }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={initial}
      animate={visible}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}
