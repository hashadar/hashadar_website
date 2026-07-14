"use client";

import { Heading } from "@/components/ui/typography/heading";
import { ReactNode } from "react";
import { MotionReveal } from "@/components/ui/motion-reveal";

interface SectionHeaderProps {
  children: ReactNode;
  size?: "hero" | "xl" | "lg" | "md" | "sm";
  className?: string;
  align?: "left" | "center" | "right";
  showLeftAccent?: boolean;
  showRightAccent?: boolean;
  showBottomAccent?: boolean;
  animated?: boolean;
  delay?: number;
  id?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

export function SectionHeader({
  children,
  size = "lg",
  className = "",
  align = "left",
  showLeftAccent = true,
  showRightAccent = false,
  showBottomAccent = false,
  animated = true,
  delay = 0,
  id,
  as,
}: SectionHeaderProps) {
  const alignmentClasses = {
    left: "",
    center: "text-center",
    right: "text-right",
  };

  const content = (
    <div className={`relative w-full ${alignmentClasses[align]}`}>
      {showLeftAccent && (
        <div className="absolute -left-4 top-0 w-1 h-full bg-[var(--primary)] transform -skew-y-12 hidden sm:block" />
      )}

      {showRightAccent && (
        <div className="absolute -right-4 bottom-0 w-16 h-px bg-[var(--primary)] transform skew-x-12 opacity-30 hidden sm:block" />
      )}

      <Heading id={id} as={as} size={size} className={`relative w-full ${className}`}>
        {children}
        {showBottomAccent && (
          <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[var(--primary)] opacity-10 transform rotate-45 hidden sm:block" />
        )}
      </Heading>
    </div>
  );

  if (!animated) {
    return content;
  }

  return (
    <MotionReveal variant="fade-up" distance="lg" delay={delay}>
      {content}
    </MotionReveal>
  );
}
