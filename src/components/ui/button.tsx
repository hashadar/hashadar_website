import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode;
  variant?: "primary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  className?: string;
  asChild?: boolean;
  href?: string;
}

const variantClasses = {
  primary: "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]",
  ghost: "bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)]",
  outline: "border border-[var(--border)] bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)]",
};

const sizeClasses = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-lg",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  asChild,
  href,
  ...props
}: ButtonProps) {
  const buttonClasses = cn(
    "font-body font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 inline-flex items-center justify-center relative z-10",
    variantClasses[variant],
    sizeClasses[size],
    className
  );

  if (asChild) {
    return <span className={buttonClasses}>{children}</span>;
  }

  if (href) {
    return (
      <Link href={href} className={buttonClasses} style={{ textDecoration: 'none' }}>
        {children}
      </Link>
    );
  }

  return (
    <button className={buttonClasses} {...props}>
      {children}
    </button>
  );
}