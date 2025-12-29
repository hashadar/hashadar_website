"use client";

import { motion } from "framer-motion";

type SectionBackgroundVariant = "about-experience" | "photography";

interface SectionBackgroundProps {
  variant?: SectionBackgroundVariant;
}

export function SectionBackground({ variant = "about-experience" }: SectionBackgroundProps) {
  return (
    <>
      {/* Background geometric pattern */}
      <div className="absolute inset-0 geometric-pattern opacity-5 pointer-events-none" />
      
      {variant === "about-experience" ? (
        <>
          {/* Angular accent lines */}
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent opacity-30 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-full h-px bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent opacity-20 pointer-events-none" />
          
          {/* Floating geometric shapes */}
          <motion.div 
            className="absolute top-1/4 right-8 w-12 h-12 border-2 border-[var(--primary)] transform rotate-45 opacity-10 pointer-events-none"
            animate={{ 
              rotate: [45, 225, 45],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 8, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          />
          <motion.div 
            className="absolute bottom-1/3 left-8 w-8 h-8 bg-[var(--primary)] opacity-15 transform -rotate-12 pointer-events-none"
            animate={{ 
              y: [-8, 8, -8],
              rotate: [-12, 168, -12]
            }}
            transition={{ 
              duration: 6, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          />
          <motion.div 
            className="absolute top-1/2 left-1/4 w-6 h-6 border border-[var(--primary)] transform rotate-12 opacity-20 pointer-events-none"
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.2, 0.4, 0.2]
            }}
            transition={{ 
              duration: 5, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          />
        </>
      ) : (
        <>
          {/* Photography variant - simpler static accents */}
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent opacity-30 pointer-events-none" />
          <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-[var(--primary)] to-transparent opacity-20 pointer-events-none" />
          
          {/* Static geometric accents for visual balance */}
          <div className="absolute bottom-1/4 left-1/4 w-16 h-px bg-[var(--primary)] opacity-15 transform -skew-x-12 pointer-events-none" />
          <div className="absolute top-1/3 right-1/3 w-8 h-8 border border-[var(--primary)] opacity-10 transform rotate-45 pointer-events-none" />
        </>
      )}
    </>
  );
}

