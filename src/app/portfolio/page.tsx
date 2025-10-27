import { Metadata } from "next";
import dynamic from "next/dynamic";
import { Header, SkipToContent } from "@/components/ui";
import { site, footer } from "@/data";

// Lazy load heavy components
const PortfolioGrid = dynamic(() => import("@/components/sections/portfolio/portfolio-grid").then(mod => ({ default: mod.PortfolioGrid })), {
  loading: () => <div className="min-h-screen flex items-center justify-center"><div className="text-[var(--foreground)]">Loading...</div></div>,
});

const FooterSection = dynamic(() => import("@/components/sections/footer-section").then(mod => ({ default: mod.FooterSection })), {
  loading: () => <div className="min-h-[400px]" />,
});

export const metadata: Metadata = {
  title: `Photography Portfolio - ${site.metadata.author}`,
  description: "Explore my photography portfolio featuring portraiture and travel photography.",
  openGraph: {
    title: `Photography Portfolio - ${site.metadata.author}`,
    description: "Explore my photography portfolio featuring portraiture and travel photography.",
    url: `${site.metadata.siteUrl}/portfolio`,
    type: "website",
  },
};

export default function PortfolioPage() {
  return (
    <>
      <SkipToContent />
      <Header />
      <main id="main-content" className="bg-[var(--background)] min-h-screen pt-20">
        <PortfolioGrid />
        <FooterSection {...footer.contact} />
      </main>
    </>
  );
}

