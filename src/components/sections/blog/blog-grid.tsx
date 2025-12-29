"use client";

import { useState, useMemo } from "react";
import { SectionHeader, Container, Section, BlogCard } from "@/components/ui";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { blog } from "@/data";
import type { BlogPost } from "@/data/types";

interface BlogGridProps {
  posts: BlogPost[];
}

type SortOption = "latest" | "oldest" | "title";

export function BlogGrid({ posts }: BlogGridProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortOption, setSortOption] = useState<SortOption>("latest");

  // Get unique categories from posts
  const categories = useMemo(() => {
    const cats = new Set(posts.map((post) => post.frontmatter.category));
    return Array.from(cats).sort();
  }, [posts]);

  // Filter and sort posts
  const filteredAndSortedPosts = useMemo(() => {
    let filtered = posts;

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (post) => post.frontmatter.category === selectedCategory
      );
    }

    // Sort posts
    const sorted = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case "latest":
          return (
            new Date(b.frontmatter.date).getTime() -
            new Date(a.frontmatter.date).getTime()
          );
        case "oldest":
          return (
            new Date(a.frontmatter.date).getTime() -
            new Date(b.frontmatter.date).getTime()
          );
        case "title":
          return a.frontmatter.title.localeCompare(b.frontmatter.title);
        default:
          return 0;
      }
    });

    return sorted;
  }, [posts, selectedCategory, sortOption]);

  return (
    <Section className="py-20">
      <Container>
        {/* Header */}
        <div className="mb-16 space-y-4">
          <SectionHeader animated={false}>
            {blog.heading}
          </SectionHeader>
          
          <p className="text-[var(--foreground)] text-lg max-w-2xl">
            {blog.description}
          </p>
        </div>

        {/* Filters and Sort */}
        {posts.length > 0 && (
          <div className="mb-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Category Filter */}
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
              <label
                htmlFor="category-filter"
                className="text-sm font-medium text-[var(--foreground)]/70"
              >
                {blog.filterLabel}:
              </label>
              <select
                id="category-filter"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 transition-colors"
              >
                <option value="all">{blog.allCategories}</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Option */}
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
              <label
                htmlFor="sort-option"
                className="text-sm font-medium text-[var(--foreground)]/70"
              >
                {blog.sortLabel}:
              </label>
              <select
                id="sort-option"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 transition-colors"
              >
                <option value="latest">{blog.sortOptions.latest}</option>
                <option value="oldest">{blog.sortOptions.oldest}</option>
                <option value="title">{blog.sortOptions.title}</option>
              </select>
            </div>
          </div>
        )}

        {/* Blog Posts Grid */}
        {filteredAndSortedPosts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[var(--foreground)]/60">
              {posts.length === 0
                ? blog.emptyState
                : `No posts found in "${selectedCategory === "all" ? blog.allCategories : selectedCategory}" category.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedPosts.map((post, index) => (
              <motion.div
                key={post.slug}
                initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={prefersReducedMotion ? { duration: 0 } : { 
                  duration: 0.5, 
                  delay: index * 0.05,
                  ease: "easeOut" 
                }}
              >
                <BlogCard
                  slug={post.slug}
                  title={post.frontmatter.title}
                  excerpt={post.frontmatter.excerpt}
                  category={post.frontmatter.category}
                  date={post.frontmatter.date}
                  author={post.frontmatter.author}
                  image={post.frontmatter.image}
                  priority={index < 6}
                />
              </motion.div>
            ))}
          </div>
        )}
      </Container>
    </Section>
  );
}

