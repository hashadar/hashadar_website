import { Metadata } from "next";
import { SitePage } from "@/components/layout/site-page";
import { PortfolioGrid } from "@/components/sections/portfolio/portfolio-grid";
import { getPageData, site } from "@/data";

const portfolio = getPageData("/portfolio");

export const metadata: Metadata = {
  title: `${portfolio.heading} - ${site.metadata.author}`,
  description: portfolio.description,
  openGraph: {
    title: `${portfolio.heading} - ${site.metadata.author}`,
    description: portfolio.description,
    url: `${site.metadata.siteUrl}/portfolio`,
    type: "website",
  },
};

export default function PortfolioPage() {
  return (
    <SitePage mainClassName="min-h-screen pt-20">
      <PortfolioGrid />
    </SitePage>
  );
}
