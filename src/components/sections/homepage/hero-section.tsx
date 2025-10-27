"use client";

import { Heading, Container, HeroBackground } from "@/components/ui";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

interface HeroSectionProps {
  name: string;
  title: string;
}

export function HeroSection({ name, title }: HeroSectionProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const y = useTransform(scrollYProgress, [0, 1], prefersReducedMotion ? ["0%", "0%"] : ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], prefersReducedMotion ? [1, 1] : [1, 0]);

  return (
    <section 
      ref={containerRef}
      id="hero"
      className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[var(--background)] pt-20"
    >
      {/* Enhanced Background Elements */}
      <HeroBackground />
      
      <Container className="relative z-10 hero-container w-full">
        <div className="text-center space-y-12 md:space-y-16 lg:space-y-20 px-4 sm:px-6 w-full overflow-visible">
          {/* Main Name with Angular Styling */}
          <motion.div
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 100, rotateX: 15 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { 
              type: "spring", 
              damping: 25, 
              stiffness: 80,
              duration: 1.2
            }}
            className="relative"
          >
            {/* Angular Accent Behind Name */}
            <div className="absolute -top-6 -left-6 sm:-top-8 sm:-left-8 w-16 h-16 sm:w-24 sm:h-24 bg-[var(--primary)] opacity-5 transform rotate-45" />
            <div className="absolute -bottom-3 -right-3 sm:-bottom-4 sm:-right-4 w-12 h-12 sm:w-16 sm:h-16 border-2 border-[var(--primary)] opacity-10 transform -rotate-12" />
            
            <motion.div style={{ y, opacity }} className="w-full overflow-visible flex justify-center">
              <Heading 
                size="hero" 
                className="relative hero-text whitespace-nowrap inline-block"
              >
                <span className="relative z-10">{name}</span>
                
                {/* Angular Text Accent */}
                <motion.div 
                  className="absolute -bottom-2 -right-2 w-8 h-8 bg-[var(--primary)] opacity-20 transform rotate-45"
                  initial={{ scale: 0, rotate: 0 }}
                  animate={{ scale: 1, rotate: 45 }}
                  transition={{ delay: 1, duration: 0.8, ease: "easeOut" }}
                />
              </Heading>
            </motion.div>
          </motion.div>
          
          {/* Title with Enhanced Styling */}
          <motion.div
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={prefersReducedMotion ? { duration: 0 } : { 
              type: "spring", 
              damping: 25, 
              stiffness: 80, 
              delay: 0.8,
              duration: 1
            }}
            className="relative px-4 sm:px-0"
          >
            {/* Angular Accent Line */}
            <div className="absolute -left-6 sm:-left-8 top-1/2 w-12 sm:w-16 h-px bg-[var(--primary)] transform -skew-y-12 opacity-30" />
            
            <Heading 
              size="sm" 
              as="h2" 
              className="text-[var(--primary)] tracking-[0.25em] capitalize relative"
            >
              <span className="relative z-10">{title}</span>
              
              {/* Subtle Angular Accent */}
              <motion.div 
                className="absolute -top-1 -right-1 w-3 h-3 border border-[var(--primary)] transform rotate-45 opacity-40"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.5, duration: 0.6, ease: "easeOut" }}
              />
            </Heading>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
            animate={{ opacity: 1 }}
            transition={prefersReducedMotion ? { duration: 0 } : { delay: 2, duration: 1 }}
            className="absolute bottom-6 sm:bottom-8 left-1/2 transform -translate-x-1/2"
          >
            <motion.div
              animate={prefersReducedMotion ? {} : { y: [0, 8, 0] }}
              transition={prefersReducedMotion ? {} : { duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="flex flex-col items-center space-y-2"
            >
              <div className="w-px h-8 bg-[var(--primary)] opacity-30" />
              <div className="w-1 h-1 bg-[var(--primary)] transform rotate-45" />
            </motion.div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}