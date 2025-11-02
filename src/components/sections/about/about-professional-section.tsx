"use client";

import { SectionHeader, Text, Container, Section, SectionBackground } from "@/components/ui";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

interface AboutProfessionalSectionProps {
  heading: string;
  content: string | string[];
}

export function AboutProfessionalSection({ heading, content }: AboutProfessionalSectionProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const contentArray = Array.isArray(content) ? content : [content];

  return (
    <Section className="relative overflow-hidden">
      <SectionBackground variant="about-experience" />
      
      <Container>
        <div className="space-y-16">
          <SectionHeader showRightAccent showBottomAccent>
            {heading}
          </SectionHeader>

          <motion.div
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.8, delay: 0.2, ease: "easeOut" }}
            viewport={{ once: true }}
            className="relative max-w-4xl mx-auto"
          >
            <div className="absolute inset-0 border-2 border-[var(--primary)] opacity-20 transform -rotate-1" 
                 style={{
                   clipPath: 'polygon(0 0, calc(100% - 30px) 0, 100% 30px, 100% 100%, 30px 100%, 0 calc(100% - 30px))'
                 }} />
            
            <div className="absolute top-0 left-0 w-20 h-px bg-[var(--primary)] transform -skew-x-12 opacity-50" />
            <div className="absolute bottom-0 right-0 w-32 h-px bg-[var(--primary)] transform skew-x-12 opacity-30" />
            
            <div className="p-8 md:p-16 lg:p-20 relative z-10">
              <div className="space-y-6">
                {contentArray.map((paragraph, index) => (
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
            
            <div className="absolute top-6 right-6 w-8 h-8 border-2 border-[var(--primary)] transform rotate-45 opacity-30" />
            <div className="absolute bottom-6 left-6 w-6 h-6 bg-[var(--primary)] transform -rotate-12 opacity-10" />
          </motion.div>
        </div>
      </Container>
    </Section>
  );
}

