import dynamic from "next/dynamic";
import { SitePage } from "@/components/layout/site-page";
import { HeroSection } from "@/components/sections/homepage/hero-section";
import { careerProfile, getHomeExperienceView, home } from "@/data";

export const revalidate = 60;

const ExperienceListing = dynamic(() => import("@/components/sections/shared/experience-listing").then(mod => ({ default: mod.ExperienceListing })), {
  loading: () => <div className="min-h-screen" />,
});

export default function Home() {
  return (
    <SitePage>
      <HeroSection claim={home.claim} />
      <ExperienceListing {...getHomeExperienceView(careerProfile)} id="experience" />
    </SitePage>
  );
}
