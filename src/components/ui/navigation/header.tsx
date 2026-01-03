"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { navigation } from "@/data";
import { ThemeToggle } from "../theme-toggle";
import { useSmoothScroll } from "@/hooks/use-smooth-scroll";

export function Header() {
  useSmoothScroll();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href.startsWith("/#")) return pathname === "/";
    return pathname === href;
  };
  
  const closeMobileMenu = () => setMobileMenuOpen(false);
  
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--background)]/80 backdrop-blur-sm border-b border-[var(--border)]">
      <nav className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link 
          href="/" 
          className="font-body font-bold text-xl text-[var(--foreground)] hover:text-[var(--primary)] transition-colors"
        >
          hasha dar
        </Link>
        
        <div className="flex items-center gap-4">
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navigation.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors relative ${
                  isActive(link.href)
                    ? "text-[var(--primary)]"
                    : "text-[var(--foreground)] hover:text-[var(--primary)]"
                }`}
                aria-current={isActive(link.href) ? "page" : undefined}
              >
                {link.label}
                {isActive(link.href) && (
                  <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[var(--primary)]" />
                )}
              </Link>
            ))}
          </div>
          
          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 text-[var(--foreground)] hover:text-[var(--primary)] transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          
          <ThemeToggle />
        </div>
      </nav>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[var(--background)] border-b border-[var(--border)]">
          <div className="container mx-auto px-6 py-4 flex flex-col gap-4">
            {navigation.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMobileMenu}
                className={`text-base font-medium transition-colors ${
                  isActive(link.href)
                    ? "text-[var(--primary)]"
                    : "text-[var(--foreground)] hover:text-[var(--primary)]"
                }`}
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

