"use client";

import { Heading, Container, Section, SectionBackground, MotionReveal } from "@/components/ui";

interface AboutHeroSectionProps {
  name: string;
  title: string;
}

export function AboutHeroSection({ name, title }: AboutHeroSectionProps) {
  return (
    <Section className="relative overflow-hidden pt-28 md:pt-36 pb-20">
      <SectionBackground variant="about-experience" />

      <Container>
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <MotionReveal variant="fade-up" distance="md" inView={false}>
            <Heading size="xl" className="text-[var(--foreground)] mb-4">
              {name}
            </Heading>
          </MotionReveal>

          <MotionReveal variant="fade-up" distance="sm" delay={0.2} inView={false} className="relative">
            <div className="absolute left-1/2 -translate-x-1/2 -top-4 w-16 h-px bg-[var(--primary)] transform -skew-x-12 opacity-40" />
            <Heading size="sm" as="h2" className="text-[var(--primary)] tracking-[0.25em] capitalize relative">
              {title}
            </Heading>
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-4 w-12 h-px bg-[var(--primary)] transform skew-x-12 opacity-30" />
          </MotionReveal>
        </div>
      </Container>
    </Section>
  );
}
