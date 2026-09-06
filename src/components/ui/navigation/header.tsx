"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { navigation, site } from "@/data";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useSmoothScroll } from "@/hooks/use-smooth-scroll";
import { cn } from "@/lib/utils";

export function Header() {
  useSmoothScroll();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const doorClassName =
    "text-sm font-medium text-[var(--foreground)] hover:text-[var(--primary)] transition-colors";

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <nav
        className="container mx-auto flex items-center justify-between px-6 py-5"
        aria-label="Primary"
      >
        <Link
          href="/"
          className="font-body text-sm tracking-tight text-[var(--foreground)] hover:text-[var(--primary)] transition-colors"
        >
          {site.brandName}
        </Link>

        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-6 md:flex">
            {navigation.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={doorClassName}
                aria-current={isActive(link.href) ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <ThemeToggle />

          <button
            className="order-2 p-2 text-[var(--foreground)] hover:text-[var(--primary)] transition-colors md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="bg-[var(--background)] md:hidden">
          <div className="container mx-auto flex flex-col gap-4 px-6 py-4">
            {navigation.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMobileMenu}
                className={cn(doorClassName, "text-base")}
                aria-current={isActive(link.href) ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
