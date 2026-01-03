"use client";

import { SectionHeader, Text, Container, Section, SectionBackground, Button, BlogCard } from "@/components/ui";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import type { BlogPost } from "@/data/types";

interface BlogSectionProps {
  heading: string;
  description?: string;
  posts: BlogPost[];
  maxPosts?: number;
}

export function BlogSection({ heading, description, posts: allPosts, maxPosts = 3 }: BlogSectionProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const posts = allPosts.slice(0, maxPosts);

  return (
    <Section id="blog" className="relative overflow-hidden">
      <SectionBackground variant="about-experience" />

      <Container>
        <div className="space-y-12 md:space-y-16">
          {/* Header */}
          <SectionHeader animated={false} showBottomAccent>
            {heading}
          </SectionHeader>

          {/* Description */}
          {description && (
            <div className="max-w-2xl mx-auto text-center">
              <Text size="lg" className="text-[var(--foreground)]/80">
                {description}
              </Text>
            </div>
          )}

          {/* Blog Posts Grid */}
          {posts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post, index) => (
                <motion.div
                  key={post.slug}
                  initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={prefersReducedMotion ? { duration: 0 } : { 
                    duration: 0.5, 
                    delay: index * 0.1,
                    ease: "easeOut" 
                  }}
                  viewport={{ once: true }}
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
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Text className="text-[var(--foreground)]/60">
                No blog posts yet. Check back soon!
              </Text>
            </div>
          )}

          {/* Button */}
          {allPosts.length > 0 && (
            <motion.div
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.6, delay: 0.4, ease: "easeOut" }}
              viewport={{ once: true }}
              className="flex justify-center pt-8 relative z-10"
            >
              <Button href="/blog" variant="primary" size="md">
                View All Posts
              </Button>
            </motion.div>
          )}
        </div>
      </Container>
    </Section>
  );
}

