"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { motionSprings } from "@/lib/motion/tokens";

interface SocialLinkProps {
  href: string;
  icon: ReactNode;
  label: string;
}

export function SocialLink({ href, icon, label }: SocialLinkProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="relative z-10 flex h-12 w-12 cursor-pointer items-center justify-center rounded-lg bg-[var(--foreground)] text-[var(--background)] transition-colors duration-300 hover:bg-[var(--primary)]"
      whileHover={prefersReducedMotion ? undefined : { scale: 1.08 }}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.96 }}
      transition={motionSprings.hover}
    >
      {icon}
    </motion.a>
  );
}
