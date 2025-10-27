"use client";

import Link from "next/link";

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
}

export function NavLink({ href, children }: NavLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    
    // Extract the section id from the href (remove the # symbol)
    const sectionId = href.replace('#', '');
    const element = document.getElementById(sectionId);
    
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // Update URL without triggering navigation
      window.history.pushState(null, '', href);
    }
  };

  return (
    <Link 
      href={href}
      className="text-[var(--foreground)] hover:text-[var(--primary)] transition-colors duration-300 block cursor-pointer relative z-10"
      onClick={handleClick}
    >
      {children}
    </Link>
  );
}

