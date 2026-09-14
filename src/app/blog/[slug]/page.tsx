import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import "katex/dist/katex.min.css";
import { Container, Section, Breadcrumb, Text } from "@/components/ui";
import { SitePage } from "@/components/layout/site-page";
import { PageIntro } from "@/components/sections/shared/page-intro";
import {
  getBlogPostBySlugFromSiteContent,
  getAllBlogSlugsFromSiteContent,
} from "@/lib/site-content/server";
import {
  formatBlogArticleDate,
  hasBlogPostHeroImage,
  resolveBlogPostImage,
} from "@/lib/blog-presentation";
import { site } from "@/data";

export const revalidate = 60;

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = await getAllBlogSlugsFromSiteContent();
  return slugs.map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlugFromSiteContent(slug);

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
      images: [
        {
          url: resolveBlogPostImage(post.frontmatter.image),
          alt: post.frontmatter.title,
        },
      ],
      publishedTime: post.frontmatter.date,
      authors: [post.frontmatter.author],
      tags: post.frontmatter.tags,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getBlogPostBySlugFromSiteContent(slug);

  if (!post) {
    notFound();
  }

  const formattedDate = formatBlogArticleDate(post.frontmatter.date);

  return (
    <SitePage mainClassName="min-h-screen">
      <PageIntro
        heading={post.frontmatter.title}
        eyebrow={
          <Breadcrumb
            items={[
              { label: "Blog", href: "/blog" },
              { label: post.frontmatter.title },
            ]}
          />
        }
        lede={
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[var(--mono-500)]">
            <Text as="span" size="xs" variant="muted">
              {post.frontmatter.author}
            </Text>
            <Text as="span" size="xs" variant="muted">
              ·
            </Text>
            <Text as="span" size="xs" variant="muted">
              <time dateTime={post.frontmatter.date}>{formattedDate}</time>
            </Text>
            {post.frontmatter.aiGeneratedContent && (
              <>
                <Text as="span" size="xs" variant="muted">
                  ·
                </Text>
                <Text as="span" size="xs" variant="muted">
                  AI generated
                </Text>
              </>
            )}
          </div>
        }
      />

      {hasBlogPostHeroImage(post.frontmatter.image) && (
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--muted)]">
          <Image
            src={post.frontmatter.image}
            alt={post.frontmatter.title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        </div>
      )}

      <Section>
        <Container>
          <article className="mx-auto max-w-3xl">
            {post.frontmatter.tags.length > 0 && (
              <Text as="p" size="xs" variant="muted" className="mb-10">
                {post.frontmatter.tags.join(" · ")}
              </Text>
            )}

            <div
              className="blog-content mb-12"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          </article>
        </Container>
      </Section>
    </SitePage>
  );
}

