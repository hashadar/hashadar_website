import dynamic from "next/dynamic";
import { SitePage } from "@/components/layout/site-page";
import { HeroSection } from "@/components/sections/homepage/hero-section";
import { home, careerProfile, getHomeExperienceView } from "@/data";
import { getRecentBlogPostsFromSiteContent } from "@/lib/site-content/server";
import { getHomePhotographyTeaser } from "@/lib/site-content/server";

export const revalidate = 60;

const AboutSection = dynamic(() => import("@/components/sections/shared/prose-section").then(mod => ({ default: mod.ProseSection })), {
  loading: () => <div className="min-h-screen" />,
});

const PhotographySection = dynamic(() => import("@/components/sections/homepage/photography-section").then(mod => ({ default: mod.PhotographySection })), {
  loading: () => <div className="min-h-screen" />,
});

const ExperienceListing = dynamic(() => import("@/components/sections/shared/experience-listing").then(mod => ({ default: mod.ExperienceListing })), {
  loading: () => <div className="min-h-screen" />,
});

const BlogSection = dynamic(() => import("@/components/sections/homepage/blog-section").then(mod => ({ default: mod.BlogSection })), {
  loading: () => <div className="min-h-[600px]" />,
});

export default async function Home() {
  const [blogPosts, teaser] = await Promise.all([
    getRecentBlogPostsFromSiteContent(3),
    getHomePhotographyTeaser(),
  ]);

  const photography = {
    ...home.photography,
    images: teaser ? [teaser] : [],
  };

  return (
    <SitePage>
      <HeroSection {...home.hero} media={teaser} />
      <AboutSection id="about" {...home.about} />
      <PhotographySection {...photography} />
      <BlogSection {...home.blog} posts={blogPosts} />
      <ExperienceListing {...getHomeExperienceView(careerProfile)} id="experience" />
    </SitePage>
  );
}
