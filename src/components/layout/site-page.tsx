import type { ReactNode } from "react";
import { Header, SkipToContent } from "@/components/ui";
import { FooterSection } from "@/components/sections/footer-section";
import { cn } from "@/lib/utils";

export interface SitePageProps {
  children: ReactNode;
  /** Extra classes on the main landmark (e.g. `min-h-screen pt-20`). */
  mainClassName?: string;
}

export function SitePage({ children, mainClassName }: SitePageProps) {
  return (
    <>
      <SkipToContent />
      <Header />
      <main id="main-content" className={cn("bg-[var(--background)]", mainClassName)}>
        {children}
        <FooterSection />
      </main>
    </>
  );
}
