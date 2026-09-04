"use client";

import {
  SectionHeader,
  Text,
  Container,
  Section,
  SectionBackground,
  Button,
  MotionReveal,
  MotionRevealGroup,
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
      <SectionBackground variant="marketing" />

      <Container>
        <div className="space-y-16">
          <SectionHeader showRightAccent showBottomAccent>
            {heading}
          </SectionHeader>

          <MotionReveal variant="fade-up" distance="md" className="relative mx-auto max-w-4xl">
            <div
              className="pointer-events-none absolute inset-0 -rotate-1 transform border-2 border-[var(--primary)] opacity-20"
              style={{
                clipPath:
                  "polygon(0 0, calc(100% - 30px) 0, 100% 30px, 100% 100%, 30px 100%, 0 calc(100% - 30px))",
              }}
            />

            <div className="pointer-events-none absolute top-0 left-0 h-px w-20 -skew-x-12 transform bg-[var(--primary)] opacity-50" />
            <div className="pointer-events-none absolute right-0 bottom-0 h-px w-32 skew-x-12 transform bg-[var(--primary)] opacity-30" />

            <div className="relative z-10 p-8 md:p-16 lg:p-20">
              <MotionRevealGroup className="space-y-6">
                {paragraphs.map((paragraph, index) => (
                  <MotionReveal key={index} variant="fade-up" distance="sm">
                    <Text size="lg" className="leading-relaxed text-[var(--foreground)]">
                      {paragraph}
                    </Text>
                  </MotionReveal>
                ))}
              </MotionRevealGroup>
            </div>

            <div className="pointer-events-none absolute top-6 right-6 h-8 w-8 rotate-45 transform border-2 border-[var(--primary)] opacity-30" />
            <div className="pointer-events-none absolute bottom-6 left-6 h-6 w-6 -rotate-12 transform bg-[var(--primary)] opacity-10" />
          </MotionReveal>

          {cta && (
            <MotionReveal
              variant="fade-up"
              distance="sm"
              className="relative z-10 flex justify-center"
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
