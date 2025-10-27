import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface SectionProps {
  children: ReactNode;
  spacing?: "sm" | "md" | "lg" | "xl";
  className?: string;
  id?: string;
}

const spacingClasses = {
  sm: "py-12 md:py-16",
  md: "py-16 md:py-24", 
  lg: "py-20 md:py-32",
  xl: "py-24 md:py-40",
};

export function Section({ children, spacing = "lg", className, id }: SectionProps) {
  return (
    <section id={id} className={cn(spacingClasses[spacing], className)}>
      {children}
    </section>
  );
}