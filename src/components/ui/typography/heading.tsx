import { cn } from "@/lib/utils";
import { ReactNode, CSSProperties } from "react";

interface HeadingProps {
  children: ReactNode;
  size?: "hero" | "xl" | "lg" | "md" | "sm";
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  className?: string;
  style?: CSSProperties;
}

// Fluid typography that scales based on viewport width with proper min/max constraints
const sizeStyles = {
  hero: { fontSize: 'clamp(56px, 12vw, 256px)', lineHeight: '0.7', letterSpacing: '-0.8px' },
  xl: { fontSize: 'clamp(48px, 8vw, 128px)', lineHeight: '0.8', letterSpacing: '-0.48px' },
  lg: { fontSize: 'clamp(32px, 5vw, 80px)', lineHeight: '0.85', letterSpacing: '-0.32px' },
  md: { fontSize: 'clamp(24px, 3vw, 48px)', lineHeight: '0.9', letterSpacing: '-0.16px' },
  sm: { fontSize: 'clamp(16px, 1.5vw, 24px)', lineHeight: '1.1', letterSpacing: '0.32px' },
};

const sizeClasses = {
  hero: "font-black",
  xl: "",
  lg: "",
  md: "",
  sm: "",
};

export function Heading({ 
  children, 
  size = "lg", 
  as: Component = "h1", 
  className,
  style
}: HeadingProps) {
  return (
    <Component 
      className={cn(
        "font-body font-bold text-[var(--foreground)] break-words",
        sizeClasses[size],
        className
      )}
      style={{
        ...sizeStyles[size],
        ...style
      }}
    >
      {children}
    </Component>
  );
}