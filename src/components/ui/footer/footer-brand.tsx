"use client";

import { motion } from "framer-motion";
import { Heading } from "../typography/heading";
import { Text } from "../typography/text";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

interface FooterBrandProps {
  brandName: string;
  copyright: string;
}

export function FooterBrand({ brandName, copyright }: FooterBrandProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  
  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.8, delay: 0.6, ease: "easeOut" }}
      viewport={{ once: true }}
      className="border-t border-[var(--border)] pt-12"
    >
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        {/* Large brand name */}
        <div className="relative flex-shrink-0">
          <Heading size="xl" className="text-[var(--foreground)] font-black tracking-tight">
            {brandName}
          </Heading>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[var(--primary)] opacity-10 transform rotate-45" />
        </div>
        
        {/* Copyright */}
        <div className="md:text-right flex-shrink-0">
          <Text variant="muted" className="text-sm whitespace-nowrap">
            {copyright}
          </Text>
        </div>
      </div>
    </motion.div>
  );
}

