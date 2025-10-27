"use client";

import { motion } from "framer-motion";

export function FooterBackground() {
  return (
    <>
      {/* Background geometric pattern */}
      <div className="absolute inset-0 geometric-pattern opacity-5" />
      
      {/* Angular accent lines */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent opacity-30" />
      <div className="absolute top-1/4 left-0 w-24 h-px bg-[var(--primary)] opacity-20 transform -skew-x-12" />
      <div className="absolute bottom-1/3 right-0 w-32 h-px bg-[var(--primary)] opacity-15 transform skew-x-12" />
      
      {/* Floating geometric shapes */}
      <motion.div 
        className="absolute top-8 right-16 w-6 h-6 border border-[var(--primary)] transform rotate-45 opacity-10"
        animate={{ 
          rotate: [45, 225, 45],
          scale: [1, 1.2, 1]
        }}
        transition={{ 
          duration: 12, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
      />
      <motion.div 
        className="absolute bottom-16 left-20 w-4 h-4 bg-[var(--primary)] opacity-15 transform -rotate-12"
        animate={{ 
          y: [-8, 8, -8],
          rotate: [-12, 168, -12]
        }}
        transition={{ 
          duration: 10, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
      />
    </>
  );
}

