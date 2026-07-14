"use client";

import {
  SectionHeader,
  Text,
  Container,
  Section,
  SectionBackground,
  Button,
  BlogCard,
  MotionReveal,
} from "@/components/ui";
import type { BlogPost } from "@/data/types";

interface BlogSectionProps {
  heading: string;
  description?: string;
  cta?: {
    label: string;
    href: string;
  };
  emptyState?: string;
  posts: BlogPost[];
  maxPosts?: number;
}

export function BlogSection({
  heading,
  description,
  cta,
  emptyState,
  posts: allPosts,
  maxPosts = 3,
}: BlogSectionProps) {
  const posts = allPosts.slice(0, maxPosts);

  return (
    <Section id="blog" className="relative overflow-hidden">
      <SectionBackground variant="about-experience" />

      <Container>
        <div className="space-y-12 md:space-y-16">
          <SectionHeader animated={false} showBottomAccent>
            {heading}
          </SectionHeader>

          {description && (
            <div className="max-w-2xl mx-auto text-center">
              <Text size="lg" className="text-[var(--foreground)]/80">
                {description}
              </Text>
            </div>
          )}

          {posts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post, index) => (
                <MotionReveal
                  key={post.slug}
                  variant="fade-up"
                  distance="sm"
                  delay={index * 0.1}
                >
                  <BlogCard
                    slug={post.slug}
                    title={post.frontmatter.title}
                    excerpt={post.frontmatter.excerpt}
                    category={post.frontmatter.category}
                    date={post.frontmatter.date}
                    author={post.frontmatter.author}
                    image={post.frontmatter.image}
                    priority={index < 3}
                  />
                </MotionReveal>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Text className="text-[var(--foreground)]/60">
                {emptyState ?? "No blog posts yet. Check back soon!"}
              </Text>
            </div>
          )}

          {allPosts.length > 0 && cta && (
            <MotionReveal
              variant="fade-up"
              distance="sm"
              delay={0.4}
              className="flex justify-center pt-8 relative z-10"
            >
              <Button href={cta.href} variant="primary" size="md">
                {cta.label}
              </Button>
            </MotionReveal>
          )}
        </div>
      </Container>
    </Section>
  );
}
