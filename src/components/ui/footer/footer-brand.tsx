"use client";

import { Heading } from "@/components/ui/typography/heading";
import { Text } from "@/components/ui/typography/text";
import { MotionReveal } from "@/components/ui/motion-reveal";

interface FooterBrandProps {
  brandName: string;
  copyright: string;
}

export function FooterBrand({ brandName, copyright }: FooterBrandProps) {
  return (
    <MotionReveal
      variant="fade-up"
      distance="md"
      delay={0.6}
      className="border-t border-[var(--border)] pt-12"
    >
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="relative flex-shrink-0">
          <Heading size="xl" className="text-[var(--foreground)] font-black tracking-tight">
            {brandName}
          </Heading>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[var(--primary)] opacity-10 transform rotate-45" />
        </div>

        <div className="md:text-right flex-shrink-0">
          <Text variant="muted" className="text-sm whitespace-nowrap">
            {copyright}
          </Text>
        </div>
      </div>
    </MotionReveal>
  );
}
