import { Metadata } from "next";
import { Header, SkipToContent } from "@/components/ui";
import { PortfolioGrid } from "@/components/sections/portfolio/portfolio-grid";
import { FooterSection } from "@/components/sections/footer-section";
import { site, footer } from "@/data";

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

