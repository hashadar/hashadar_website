import { Metadata } from "next";
import { Header, SkipToContent } from "@/components/ui";
import { BlogGrid } from "@/components/sections/blog/blog-grid";
import { FooterSection } from "@/components/sections/footer-section";
import { getAllBlogPosts } from "@/lib/blog";
import { site, footer } from "@/data";

export const metadata: Metadata = {
  title: `Blog - ${site.metadata.author}`,
  description: "Read my latest thoughts, insights, and updates on technology, photography, and more.",
  openGraph: {
    title: `Blog - ${site.metadata.author}`,
    description: "Read my latest thoughts, insights, and updates on technology, photography, and more.",
    url: `${site.metadata.siteUrl}/blog`,
    type: "website",
  },
};

export default function BlogPage() {
  const posts = getAllBlogPosts();

  return (
    <>
      <SkipToContent />
      <Header />
      <main id="main-content" className="bg-[var(--background)] min-h-screen pt-20">
        <BlogGrid posts={posts} />
        <FooterSection {...footer.contact} />
      </main>
    </>
  );
}

