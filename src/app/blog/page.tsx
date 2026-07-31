import { Metadata } from "next";
import { SitePage } from "@/components/layout/site-page";
import { BlogGrid } from "@/components/sections/blog/blog-grid";
import { getAllBlogPostsFromSiteContent } from "@/lib/site-content/server";
import { site, blog } from "@/data";

export const revalidate = 60;

export const metadata: Metadata = {
  title: `Blog - ${site.metadata.author}`,
  description: blog.description,
  openGraph: {
    title: `Blog - ${site.metadata.author}`,
    description: blog.description,
    url: `${site.metadata.siteUrl}/blog`,
    type: "website",
  },
};

export default async function BlogPage() {
  const posts = await getAllBlogPostsFromSiteContent();

  return (
    <SitePage mainClassName="min-h-screen pt-20">
      <BlogGrid posts={posts} />
    </SitePage>
  );
}
