"use client";

import { Heading, Container, Section, SectionBackground, MotionReveal } from "@/components/ui";

interface AboutHeroSectionProps {
  name: string;
  title: string;
}

export function AboutHeroSection({ name, title }: AboutHeroSectionProps) {
  return (
    <Section className="relative overflow-hidden pt-28 pb-20 md:pt-36">
      <SectionBackground variant="marketing" />

      <Container>
        <div className="mx-auto max-w-4xl space-y-8 text-center">
          <MotionReveal variant="clip-up" distance="md" inView={false}>
            <Heading size="xl" className="mb-4 text-[var(--foreground)]">
              {name}
            </Heading>
          </MotionReveal>

          <MotionReveal variant="fade-up" distance="sm" delay={0.15} inView={false} className="relative">
            <div className="absolute -top-4 left-1/2 h-px w-16 -translate-x-1/2 -skew-x-12 transform bg-[var(--primary)] opacity-40" />
            <Heading size="sm" as="h2" className="relative capitalize tracking-[0.25em] text-[var(--primary)]">
              {title}
            </Heading>
            <div className="absolute -bottom-4 left-1/2 h-px w-12 -translate-x-1/2 skew-x-12 transform bg-[var(--primary)] opacity-30" />
          </MotionReveal>
        </div>
      </Container>
    </Section>
  );
}
