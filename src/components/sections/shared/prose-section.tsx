"use client";

import {
  Text,
  Container,
  Section,
  Button,
  MotionReveal,
  MotionRevealGroup,
} from "@/components/ui";
import { InteriorHeading } from "@/components/sections/shared/page-intro";
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
    <Section id={id} className={className}>
      <Container>
        <div className="max-w-3xl space-y-10">
          <InteriorHeading>{heading}</InteriorHeading>

          <MotionRevealGroup className="space-y-6">
            {paragraphs.map((paragraph, index) => (
              <MotionReveal key={index} variant="fade-up" distance="sm">
                <Text size="lg" className="leading-relaxed text-[var(--foreground)]">
                  {paragraph}
                </Text>
              </MotionReveal>
            ))}
          </MotionRevealGroup>

          {cta && (
            <MotionReveal variant="fade-up" distance="sm">
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
