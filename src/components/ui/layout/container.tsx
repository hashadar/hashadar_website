import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface ContainerProps {
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  className?: string;
}

const sizeClasses = {
  sm: "max-w-2xl",
  md: "max-w-4xl", 
  lg: "max-w-6xl",
  xl: "max-w-7xl",
  full: "max-w-none",
};

export function Container({ children, size = "lg", className }: ContainerProps) {
  return (
    <div className={cn("mx-auto px-4 sm:px-6 md:px-8 lg:px-12", sizeClasses[size], className)}>
      {children}
    </div>
  );
}