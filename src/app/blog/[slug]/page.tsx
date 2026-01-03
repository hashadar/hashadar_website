import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { format } from "date-fns";
import "katex/dist/katex.min.css";
import { Header, SkipToContent, Container, Section, Breadcrumb } from "@/components/ui";
import { FooterSection } from "@/components/sections/footer-section";
import { getBlogPostBySlug, getAllBlogSlugs } from "@/lib/blog";
import { site, footer } from "@/data";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = getAllBlogSlugs();
  return slugs.map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    return {
      title: "Post Not Found",
    };
  }

  return {
    title: `${post.frontmatter.title} - ${site.metadata.author}`,
    description: post.frontmatter.excerpt,
    openGraph: {
      title: post.frontmatter.title,
      description: post.frontmatter.excerpt,
      url: `${site.metadata.siteUrl}/blog/${slug}`,
      type: "article",
      images: post.frontmatter.image
        ? [
            {
              url: post.frontmatter.image,
              alt: post.frontmatter.title,
            },
          ]
        : [],
      publishedTime: post.frontmatter.date,
      authors: [post.frontmatter.author],
      tags: post.frontmatter.tags,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const formattedDate = format(new Date(post.frontmatter.date), "MMMM d, yyyy");

  return (
    <>
      <SkipToContent />
      <Header />
      <main id="main-content" className="bg-[var(--background)] min-h-screen pt-20">
        <Section className="py-12">
          <Container>
            <div className="max-w-5xl mx-auto">
              {/* Breadcrumb */}
              <Breadcrumb
                items={[
                  { label: "Home", href: "/" },
                  { label: "Blog", href: "/blog" },
                  { label: post.frontmatter.title },
                ]}
                className="mb-8"
              />

              {/* Article */}
              <article className="w-full">
              {/* Header */}
              <header className="mb-8">
                {/* Category */}
                <div className="mb-4">
                  <span className="text-[var(--primary)] font-medium text-sm uppercase tracking-wide">
                    {post.frontmatter.category}
                  </span>
                </div>

                {/* Title */}
                <h1 className="text-[var(--foreground)] font-body font-bold text-4xl md:text-5xl mb-6">
                  {post.frontmatter.title}
                </h1>

                {/* Meta info */}
                <div className="mb-8">
                  <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--foreground)]/60 mb-3">
                    <span>{post.frontmatter.author}</span>
                    <span>•</span>
                    <time dateTime={post.frontmatter.date}>{formattedDate}</time>
                    {post.frontmatter.aiGeneratedContent && (
                      <>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-[var(--muted)] border border-[var(--border)] rounded text-xs text-[var(--foreground)]/70">
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                            />
                          </svg>
                          AI Generated
                        </span>
                      </>
                    )}
                  </div>
                  {post.frontmatter.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {post.frontmatter.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-[var(--muted)] rounded text-xs text-[var(--foreground)]/60"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Featured Image - don't show if empty or placeholder */}
                {post.frontmatter.image && 
                 post.frontmatter.image.trim() !== '' && 
                 post.frontmatter.image !== '/img/mangrove_beach.webp' && (
                  <div className="relative aspect-[16/9] overflow-hidden rounded-lg mb-8 bg-[var(--muted)]">
                    <Image
                      src={post.frontmatter.image}
                      alt={post.frontmatter.title}
                      fill
                      className="object-cover"
                      priority
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 90vw, 896px"
                    />
                  </div>
                )}
              </header>

              {/* Content */}
              <div
                className="blog-content mb-12"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
              </article>
            </div>
          </Container>
        </Section>
        <FooterSection {...footer.contact} />
      </main>
    </>
  );
}

