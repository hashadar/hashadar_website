"use client";

import { Heading } from "@/components/ui/typography/heading";
import { MotionReveal } from "@/components/ui/motion-reveal";
import { ReactNode } from "react";

interface FooterColumnProps {
  title: string;
  children: ReactNode;
  delay?: number;
}

export function FooterColumn({ title, children, delay = 0 }: FooterColumnProps) {
  return (
    <MotionReveal variant="fade-up" distance="lg" delay={delay} className="space-y-6">
      <div className="relative">
        <div className="absolute -left-4 top-0 w-1 h-full bg-[var(--primary)] transform -skew-y-12" />
        <Heading size="md" className="relative">
          <span className="relative z-10">{title}</span>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[var(--primary)] opacity-10 transform rotate-45" />
        </Heading>
      </div>
      {children}
    </MotionReveal>
  );
}
