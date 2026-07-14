import { Metadata } from "next";
import { SitePage } from "@/components/layout/site-page";
import { BlogGrid } from "@/components/sections/blog/blog-grid";
import { getAllBlogPosts } from "@/lib/blog";
import { site, blog } from "@/data";

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

export default function BlogPage() {
  const posts = getAllBlogPosts();

  return (
    <SitePage mainClassName="min-h-screen pt-20">
      <BlogGrid posts={posts} />
    </SitePage>
  );
}
