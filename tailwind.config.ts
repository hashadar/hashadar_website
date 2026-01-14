import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/styles/**/*.css",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        body: ["var(--font-body)"],
      },
    },
  },
  plugins: [
    function({ addUtilities }: any) {
      const newUtilities = {
        '.geometric-pattern': {
          position: 'absolute',
          inset: '0',
          opacity: '0.15',
          backgroundImage: 'linear-gradient(var(--mono-300) 1px, transparent 1px), linear-gradient(90deg, var(--mono-300) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        },
        '.dark .geometric-pattern': {
          opacity: '0.25',
          backgroundImage: 'linear-gradient(var(--mono-600) 1px, transparent 1px), linear-gradient(90deg, var(--mono-600) 1px, transparent 1px)',
        },
        '.hover\\:scale-102:hover': {
          transform: 'scale(1.02)',
        },
        '.angular-clip': {
          clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))',
        },
        '.angular-clip-reverse': {
          clipPath: 'polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)',
        },
        '.perspective-1000': {
          perspective: '1000px',
        },
        '.transform-style-preserve-3d': {
          transformStyle: 'preserve-3d',
        },
        '.shadow-angular': {
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(4, 120, 87, 0.1)',
        },
        '.hero-parallax': {
          willChange: 'transform',
        },
      };
      addUtilities(newUtilities);
    },
  ],
};

export default config;

