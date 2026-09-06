"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type RefObject } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

export interface LoopProps {
  src?: string | null;
  className?: string;
  objectPosition?: string;
}

export type LoopState = "live" | "frozen" | "fallback";

function useInView(elementRef: RefObject<HTMLElement | null>): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
      },
      { threshold: 0.15 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [elementRef]);

  return inView;
}

export function Loop({ src, className, objectPosition = "center" }: LoopProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef);
  const prefersReducedMotion = usePrefersReducedMotion();
  const hasSrc = typeof src === "string" && src.length > 0;

  const state: LoopState = !hasSrc
    ? "fallback"
    : inView && !prefersReducedMotion
      ? "live"
      : "frozen";
  const motion = state === "live";

  return (
    <div
      ref={rootRef}
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      aria-hidden="true"
      data-loop={state}
    >
      <div className={cn("loop-plate absolute inset-0", motion && "loop-plate-motion")}>
        {hasSrc ? (
          <Image
            src={src}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
            style={{ objectPosition }}
            quality={85}
          />
        ) : (
          <div className="loop-fallback absolute inset-0" />
        )}
      </div>
      <div className={cn("loop-grain absolute inset-0", motion && "loop-grain-motion")} />
      <div className={cn("loop-light absolute inset-0", motion && "loop-light-motion")} />
    </div>
  );
}
