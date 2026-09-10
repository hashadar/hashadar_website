"use client";

import {
  Children,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { motion, type Transition } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";
import {
  fadeUpDistance,
  motionDurations,
  motionEasings,
  motionSprings,
  motionStagger,
} from "@/lib/motion/tokens";

export type MotionRevealVariant = "fade-up" | "fade" | "slide-in" | "clip-up" | "none";
export type MotionRevealDistance = keyof typeof fadeUpDistance;

export interface MotionRevealProps {
  children: ReactNode;
  variant?: MotionRevealVariant;
  delay?: number;
  className?: string;
  /** When true (default), reveal on scroll with whileInView; otherwise animate on mount. */
  inView?: boolean;
  distance?: MotionRevealDistance;
}

export interface MotionRevealGroupProps {
  children: ReactNode;
  className?: string;
  /** Per-item delay in seconds. Defaults to `motionStagger.step`. */
  stagger?: number;
}

const GroupStaggerContext = createContext<number | null>(null);
const GroupIndexContext = createContext(0);

export function MotionRevealGroup({
  children,
  className,
  stagger = motionStagger.step,
}: MotionRevealGroupProps) {
  return (
    <GroupStaggerContext.Provider value={stagger}>
      <div className={className}>
        {Children.map(children, (child, index) => (
          <GroupIndexContext.Provider value={index}>{child}</GroupIndexContext.Provider>
        ))}
      </div>
    </GroupStaggerContext.Provider>
  );
}

function spatialTransition(delay: number): Transition {
  return { ...motionSprings.reveal, delay };
}

function fadeTransition(delay: number): Transition {
  return {
    duration: motionDurations.base,
    delay,
    ease: motionEasings.out,
  };
}

export function MotionReveal({
  children,
  variant = "fade-up",
  delay = 0,
  className,
  inView = true,
  distance = "md",
}: MotionRevealProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const groupStagger = useContext(GroupStaggerContext);
  const groupIndex = useContext(GroupIndexContext);
  const resolvedDelay = delay + (groupStagger == null ? 0 : groupIndex * groupStagger);

  if (variant === "none" || prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  const offset = fadeUpDistance[distance];

  const initial =
    variant === "fade"
      ? { opacity: 0 }
      : variant === "slide-in"
        ? { opacity: 0, x: -offset }
        : { opacity: 0, y: offset };

  const visible =
    variant === "fade"
      ? { opacity: 1 }
      : variant === "slide-in"
        ? { opacity: 1, x: 0 }
        : { opacity: 1, y: 0 };

  const transition =
    variant === "fade" ? fadeTransition(resolvedDelay) : spatialTransition(resolvedDelay);

  const motionProps = inView
    ? { initial, whileInView: visible, viewport: { once: true } as const, transition }
    : { initial, animate: visible, transition };

  if (variant === "clip-up") {
    return (
      <div className={cn("overflow-hidden", className)}>
        <motion.div {...motionProps}>{children}</motion.div>
      </div>
    );
  }

  return (
    <motion.div className={className} {...motionProps}>
      {children}
    </motion.div>
  );
}
