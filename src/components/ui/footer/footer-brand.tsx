"use client";

import { motion } from "framer-motion";
import { Heading } from "../typography/heading";
import { Text } from "../typography/text";

interface FooterBrandProps {
  brandName: string;
  copyright: string;
}

export function FooterBrand({ brandName, copyright }: FooterBrandProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
      viewport={{ once: true }}
      className="border-t border-[var(--border)] pt-12"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        {/* Large brand name */}
        <div className="relative">
          <Heading size="hero" className="text-[var(--foreground)] font-black tracking-tight whitespace-nowrap">
            {brandName}
          </Heading>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[var(--primary)] opacity-10 transform rotate-45" />
        </div>
        
        {/* Copyright */}
        <div className="text-right">
          <Text variant="muted" className="text-sm">
            {copyright}
          </Text>
        </div>
      </div>
    </motion.div>
  );
}

