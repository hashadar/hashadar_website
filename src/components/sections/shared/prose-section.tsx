"use client";

import {
  SectionHeader,
  Text,
  Container,
  Section,
  SectionBackground,
  Button,
  MotionReveal,
} from "@/components/ui";
import type { AboutSection } from "@/data/types";

export interface ProseSectionProps extends AboutSection {
  id?: string;
  className?: string;
}

export function ProseSection({
  heading,
  content,
  cta,
  id,
  className,
}: ProseSectionProps) {
  const paragraphs = Array.isArray(content) ? content : [content];

  return (
    <Section id={id} className={`relative overflow-hidden ${className ?? ""}`.trim()}>
      <SectionBackground variant="about-experience" />

      <Container>
        <div className="space-y-16">
          <SectionHeader showRightAccent showBottomAccent>
            {heading}
          </SectionHeader>

          <MotionReveal variant="fade-up" distance="md" delay={0.2} className="relative max-w-4xl mx-auto">
            <div
              className="absolute inset-0 border-2 border-[var(--primary)] opacity-20 transform -rotate-1 pointer-events-none"
              style={{
                clipPath:
                  "polygon(0 0, calc(100% - 30px) 0, 100% 30px, 100% 100%, 30px 100%, 0 calc(100% - 30px))",
              }}
            />

            <div className="absolute top-0 left-0 w-20 h-px bg-[var(--primary)] transform -skew-x-12 opacity-50 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-32 h-px bg-[var(--primary)] transform skew-x-12 opacity-30 pointer-events-none" />

            <div className="p-8 md:p-16 lg:p-20 relative z-10">
              <div className="space-y-6">
                {paragraphs.map((paragraph, index) => (
                  <Text
                    key={index}
                    size="lg"
                    className="leading-relaxed text-[var(--foreground)]"
                  >
                    {paragraph}
                  </Text>
                ))}
              </div>
            </div>

            <div className="absolute top-6 right-6 w-8 h-8 border-2 border-[var(--primary)] transform rotate-45 opacity-30 pointer-events-none" />
            <div className="absolute bottom-6 left-6 w-6 h-6 bg-[var(--primary)] transform -rotate-12 opacity-10 pointer-events-none" />
          </MotionReveal>

          {cta && (
            <MotionReveal
              variant="fade-up"
              distance="sm"
              delay={0.4}
              className="flex justify-center relative z-10"
            >
              <Button href={cta.href} variant="primary" size="md">
                {cta.label}
              </Button>
            </MotionReveal>
          )}
        </div>
      </Container>
    </Section>
  );
}
