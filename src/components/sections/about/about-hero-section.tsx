"use client";

import { Heading, Container, Section, SectionBackground } from "@/components/ui";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

interface AboutHeroSectionProps {
  name: string;
  title: string;
}

export function AboutHeroSection({ name, title }: AboutHeroSectionProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <Section className="relative overflow-hidden pt-28 md:pt-36 pb-20">
      <SectionBackground variant="about-experience" />
      
      <Container>
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <motion.div
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.8, ease: "easeOut" }}
          >
            <Heading size="xl" className="text-[var(--foreground)] mb-4">
              {name}
            </Heading>
          </motion.div>

          <motion.div
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.8, delay: 0.2, ease: "easeOut" }}
            className="relative"
          >
            <div className="absolute left-1/2 -translate-x-1/2 -top-4 w-16 h-px bg-[var(--primary)] transform -skew-x-12 opacity-40" />
            <Heading size="sm" as="h2" className="text-[var(--primary)] tracking-[0.25em] capitalize relative">
              {title}
            </Heading>
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-4 w-12 h-px bg-[var(--primary)] transform skew-x-12 opacity-30" />
          </motion.div>
        </div>
      </Container>
    </Section>
  );
}

