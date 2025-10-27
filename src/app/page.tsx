import dynamic from "next/dynamic";
import { Header, SkipToContent } from "@/components/ui";
import { HeroSection } from "@/components/sections/homepage/hero-section";
import { home, footer } from "@/data";

// Lazy load below-the-fold sections for better performance
const AboutSection = dynamic(() => import("@/components/sections/homepage/about-section").then(mod => ({ default: mod.AboutSection })), {
  loading: () => <div className="min-h-screen" />,
});

const PhotographySection = dynamic(() => import("@/components/sections/homepage/photography-section").then(mod => ({ default: mod.PhotographySection })), {
  loading: () => <div className="min-h-screen" />,
});

const ExperienceSection = dynamic(() => import("@/components/sections/homepage/experience-section").then(mod => ({ default: mod.ExperienceSection })), {
  loading: () => <div className="min-h-screen" />,
});

const FooterSection = dynamic(() => import("@/components/sections/footer-section").then(mod => ({ default: mod.FooterSection })), {
  loading: () => <div className="min-h-[400px]" />,
});

export default function Home() {
  return (
    <>
      <SkipToContent />
      <Header />
      <main id="main-content" className="bg-[var(--background)]">
        <HeroSection {...home.hero} />
        <AboutSection {...home.about} />
        <PhotographySection {...home.photography} />
        <ExperienceSection {...home.experience} />
        <FooterSection {...footer.contact} />
      </main>
    </>
  );
}