import { ThemeToggle, SkipToContent } from "@/components/ui";
import { HeroSection } from "@/components/sections/homepage/hero-section";
import { AboutSection } from "@/components/sections/homepage/about-section";
import { PhotographySection } from "@/components/sections/homepage/photography-section";
import { ExperienceSection } from "@/components/sections/homepage/experience-section";
import { FooterSection } from "@/components/sections/footer-section";
import { home, footer } from "@/data";

export default function Home() {
  return (
    <>
      <SkipToContent />
      <main id="main-content" className="bg-[var(--background)]">
        <div className="fixed top-6 right-6 z-50">
          <ThemeToggle />
        </div>
        
        <HeroSection {...home.hero} />
        <AboutSection {...home.about} />
        <PhotographySection {...home.photography} />
        <ExperienceSection {...home.experience} />
        <FooterSection {...footer.contact} />
      </main>
    </>
  );
}