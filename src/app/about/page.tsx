import { Metadata } from "next";
import { Header, SkipToContent } from "@/components/ui";
import dynamic from "next/dynamic";
import { site, footer, about } from "@/data";
import { AboutHeroSection } from "@/components/sections/about/about-hero-section";

const AboutProfessionalSection = dynamic(() => import("@/components/sections/about/about-professional-section").then(mod => ({ default: mod.AboutProfessionalSection })), {
  loading: () => <div className="min-h-[400px]" />,
});

const AboutEducationSection = dynamic(() => import("@/components/sections/about/about-education-section").then(mod => ({ default: mod.AboutEducationSection })), {
  loading: () => <div className="min-h-[400px]" />,
});

const FooterSection = dynamic(() => import("@/components/sections/footer-section").then(mod => ({ default: mod.FooterSection })), {
  loading: () => <div className="min-h-[400px]" />,
});

export const metadata: Metadata = {
  title: `About - ${site.metadata.author}`,
  description: "Learn more about my background and experience.",
  openGraph: {
    title: `About - ${site.metadata.author}`,
    description: "Learn more about my background and experience.",
    url: `${site.metadata.siteUrl}/about`,
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <>
      <SkipToContent />
      <Header />
      <main id="main-content" className="bg-[var(--background)]">
        <AboutHeroSection {...about.hero} />
        <AboutProfessionalSection {...about.professional} />
        <AboutEducationSection {...about.education} />
        <FooterSection {...footer.contact} />
      </main>
    </>
  );
}

