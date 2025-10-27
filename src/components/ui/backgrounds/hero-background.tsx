"use client";

import { motion } from "framer-motion";

export function HeroBackground() {
  return (
    <div className="absolute inset-0">
      {/* Geometric Pattern */}
      <div className="geometric-pattern opacity-10" />
      
      {/* Angular Accent Lines */}
      <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent opacity-20" />
      <div className="absolute top-1/2 right-0 w-px h-32 bg-gradient-to-b from-transparent via-[var(--primary)] to-transparent opacity-15" />
      <div className="absolute bottom-1/3 left-0 w-24 h-px bg-[var(--primary)] opacity-30 transform -skew-x-12" />
      
      {/* Floating Geometric Shapes */}
      <motion.div 
        className="absolute top-20 right-20 w-12 h-12 sm:w-16 sm:h-16 border border-[var(--primary)] transform rotate-45 opacity-10"
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
        className="absolute bottom-32 left-16 w-6 h-6 sm:w-8 sm:h-8 bg-[var(--primary)] opacity-20 transform rotate-12"
        animate={{ 
          y: [-10, 10, -10],
          rotate: [12, 192, 12]
        }}
        transition={{ 
          duration: 6, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
      />
      <motion.div 
        className="absolute top-1/3 left-1/4 w-3 h-3 sm:w-4 sm:h-4 border-2 border-[var(--primary)] transform -rotate-45 opacity-15"
        animate={{ 
          scale: [1, 1.5, 1],
          opacity: [0.15, 0.3, 0.15]
        }}
        transition={{ 
          duration: 4, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
      />
    </div>
  );
}

