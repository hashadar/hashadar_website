import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface TextProps {
  children: ReactNode;
  size?: "lg" | "base" | "sm" | "xs";
  variant?: "default" | "muted" | "accent";
  as?: "p" | "span" | "div";
  className?: string;
}

const sizeClasses = {
  lg: "text-2xl leading-relaxed",
  base: "text-lg leading-relaxed",
  sm: "text-base leading-normal",
  xs: "text-sm leading-normal",
};

const variantClasses = {
  default: "text-[var(--foreground)]",
  muted: "text-[var(--mono-500)]",
  accent: "text-[var(--primary)]",
};

export function Text({ 
  children, 
  size = "base", 
  variant = "default",
  as: Component = "p", 
  className 
}: TextProps) {
  return (
    <Component 
      className={cn(
        "font-body",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      {children}
    </Component>
  );
}