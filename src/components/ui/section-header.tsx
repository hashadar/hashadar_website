"use client";

import { motion } from "framer-motion";
import { Heading } from "./typography/heading";
import { ReactNode } from "react";

interface SectionHeaderProps {
  children: ReactNode;
  size?: "hero" | "xl" | "lg" | "md" | "sm";
  className?: string;
  align?: "left" | "center" | "right";
  showLeftAccent?: boolean;
  showRightAccent?: boolean;
  showBottomAccent?: boolean;
  animated?: boolean;
  delay?: number;
}

export function SectionHeader({
  children,
  size = "lg",
  className = "",
  align = "left",
  showLeftAccent = true,
  showRightAccent = false,
  showBottomAccent = false,
  animated = true,
  delay = 0,
}: SectionHeaderProps) {
  const alignmentClasses = {
    left: "",
    center: "text-center",
    right: "text-right",
  };

  const content = (
    <div className={`relative w-full ${alignmentClasses[align]}`}>
      {/* Left vertical accent line */}
      {showLeftAccent && (
        <div className="absolute -left-4 top-0 w-1 h-16 bg-[var(--primary)] transform -skew-y-12 hidden sm:block" />
      )}
      
      {/* Right bottom horizontal accent line */}
      {showRightAccent && (
        <div className="absolute -right-4 bottom-0 w-16 h-px bg-[var(--primary)] transform skew-x-12 opacity-30 hidden sm:block" />
      )}
      
      <Heading 
        size={size} 
        className={`relative w-full ${className}`}
      >
        {children}
        {/* Bottom right decorative square */}
        {showBottomAccent && (
          <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[var(--primary)] opacity-10 transform rotate-45 hidden sm:block" />
        )}
      </Heading>
    </div>
  );

  if (!animated) {
    return content;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay, ease: "easeOut" }}
      viewport={{ once: true }}
    >
      {content}
    </motion.div>
  );
}

