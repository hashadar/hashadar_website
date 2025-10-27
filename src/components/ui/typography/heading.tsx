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
  hero: { fontSize: 'clamp(3.5rem, 12vw, 16rem)', lineHeight: '0.7', letterSpacing: '-0.05em' },
  xl: { fontSize: 'clamp(3rem, 8vw, 8rem)', lineHeight: '0.8', letterSpacing: '-0.03em' },
  lg: { fontSize: 'clamp(2rem, 5vw, 5rem)', lineHeight: '0.85', letterSpacing: '-0.02em' },
  md: { fontSize: 'clamp(1.5rem, 3vw, 3rem)', lineHeight: '0.9', letterSpacing: '-0.01em' },
  sm: { fontSize: 'clamp(1rem, 1.5vw, 1.5rem)', lineHeight: '1.1', letterSpacing: '0.02em' },
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
        "font-display font-bold text-[var(--foreground)] break-words",
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