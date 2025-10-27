import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  variant?: "default" | "muted";
  className?: string;
}

const variantClasses = {
  default: "bg-[var(--background)] border border-[var(--border)]",
  muted: "bg-[var(--muted)] border border-[var(--border)]",
};

export function Card({ children, variant = "default", className }: CardProps) {
  return (
    <div className={cn("p-6", variantClasses[variant], className)}>
      {children}
    </div>
  );
}