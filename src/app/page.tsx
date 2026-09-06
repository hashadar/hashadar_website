import dynamic from "next/dynamic";
import { SitePage } from "@/components/layout/site-page";
import { HeroSection } from "@/components/sections/homepage/hero-section";
import { careerProfile, getHomeExperienceView, site } from "@/data";
import { getHomePhotographyTeaser } from "@/lib/site-content/server";

export const revalidate = 60;

const ExperienceListing = dynamic(() => import("@/components/sections/shared/experience-listing").then(mod => ({ default: mod.ExperienceListing })), {
  loading: () => <div className="min-h-screen" />,
});

export default async function Home() {
  const teaser = await getHomePhotographyTeaser();

  return (
    <SitePage>
      <HeroSection name={site.brandName} title={site.person.jobTitle} media={teaser} />
      <ExperienceListing {...getHomeExperienceView(careerProfile)} id="experience" />
    </SitePage>
  );
}
