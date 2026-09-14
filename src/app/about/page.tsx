import { Metadata } from "next";
import dynamic from "next/dynamic";
import { SitePage } from "@/components/layout/site-page";
import { site, about, careerProfile, footer, getAboutCareerViews, home } from "@/data";
import { AboutHeroSection } from "@/components/sections/about/about-hero-section";

const CareerRecord = dynamic(
  () =>
    import("@/components/sections/about/career-record").then((mod) => ({
      default: mod.CareerRecord,
    })),
  {
    loading: () => <div className="min-h-screen bg-[var(--background)]" />,
  },
);

const aboutDescription = about.lede[0];

export const metadata: Metadata = {
  title: `About - ${site.metadata.author}`,
  description: aboutDescription,
  openGraph: {
    title: `About - ${site.metadata.author}`,
    description: aboutDescription,
    url: `${site.metadata.siteUrl}/about`,
    type: "website",
  },
};

export default function AboutPage() {
  const careerViews = getAboutCareerViews(careerProfile);

  return (
    <SitePage mainClassName="min-h-screen">
      <AboutHeroSection
        heading={about.heading}
        lede={about.lede}
        linkedinHref={footer.contact.social.linkedin}
        portrait={home.statement.portrait}
      />
      <CareerRecord {...careerViews} />
    </SitePage>
  );
}
