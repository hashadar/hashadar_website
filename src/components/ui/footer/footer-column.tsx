"use client";

import { motion } from "framer-motion";
import { Heading } from "../typography/heading";
import { ReactNode } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

interface FooterColumnProps {
  title: string;
  children: ReactNode;
  delay?: number;
}

export function FooterColumn({ title, children, delay = 0 }: FooterColumnProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  
  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.8, delay, ease: "easeOut" }}
      viewport={{ once: true }}
      className="space-y-6"
    >
      <div className="relative">
        <div className="absolute -left-4 top-0 w-1 h-full bg-[var(--primary)] transform -skew-y-12" />
        <Heading size="md" className="relative">
          <span className="relative z-10">{title}</span>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[var(--primary)] opacity-10 transform rotate-45" />
        </Heading>
      </div>
      {children}
    </motion.div>
  );
}

