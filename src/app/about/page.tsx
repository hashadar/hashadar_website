import { Metadata } from "next";
import dynamic from "next/dynamic";
import { SitePage } from "@/components/layout/site-page";
import { site, about, careerProfile, getAboutCareerViews } from "@/data";
import { AboutHeroSection } from "@/components/sections/about/about-hero-section";

const AboutProfessionalSection = dynamic(() => import("@/components/sections/shared/prose-section").then(mod => ({ default: mod.ProseSection })), {
  loading: () => <div className="min-h-[400px]" />,
});

const ExperienceListing = dynamic(() => import("@/components/sections/shared/experience-listing").then(mod => ({ default: mod.ExperienceListing })), {
  loading: () => <div className="min-h-[400px]" />,
});

const EducationListing = dynamic(() => import("@/components/sections/shared/education-listing").then(mod => ({ default: mod.EducationListing })), {
  loading: () => <div className="min-h-[400px]" />,
});

const CertificationsListing = dynamic(() => import("@/components/sections/shared/certifications-listing").then(mod => ({ default: mod.CertificationsListing })), {
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
  const careerViews = getAboutCareerViews(careerProfile);

  return (
    <SitePage>
      <AboutHeroSection {...about.hero} />
      <AboutProfessionalSection {...about.professional} />
      <ExperienceListing {...careerViews.experience} variant="about-experience" />
      <EducationListing {...careerViews.education} />
      <CertificationsListing {...careerViews.certifications} />
    </SitePage>
  );
}
