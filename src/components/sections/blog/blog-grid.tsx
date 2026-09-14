"use client";

import { useState, useMemo } from "react";
import {
  Container,
  Section,
  BlogCard,
  MotionReveal,
  MotionRevealGroup,
  Text,
} from "@/components/ui";
import { PageIntro } from "@/components/sections/shared/page-intro";
import { blog } from "@/data";
import type { BlogPost } from "@/data/types";
import { cn } from "@/lib/utils";

interface BlogGridProps {
  posts: BlogPost[];
}

type SortOption = "latest" | "oldest" | "title";

const selectClassName =
  "bg-transparent border-0 border-b border-[var(--border)] rounded-none px-0 py-2 text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)]";

export function BlogGrid({ posts }: BlogGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortOption, setSortOption] = useState<SortOption>("latest");

  const categories = useMemo(() => {
    const cats = new Set(posts.map((post) => post.frontmatter.category));
    return Array.from(cats).sort();
  }, [posts]);

  const filteredAndSortedPosts = useMemo(() => {
    let filtered = posts;

    if (selectedCategory !== "all") {
      filtered = filtered.filter(
        (post) => post.frontmatter.category === selectedCategory
      );
    }

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
    <>
      <PageIntro heading={blog.heading} lede={blog.description} />

      <Section>
        <Container>
          {posts.length > 0 && (
            <div className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <label
                  htmlFor="category-filter"
                  className="text-sm text-[var(--mono-500)]"
                >
                  {blog.filterLabel}
                </label>
                <select
                  id="category-filter"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className={cn(selectClassName, "min-w-[10rem]")}
                >
                  <option value="all">{blog.allCategories}</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <label
                  htmlFor="sort-option"
                  className="text-sm text-[var(--mono-500)]"
                >
                  {blog.sortLabel}
                </label>
                <select
                  id="sort-option"
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  className={cn(selectClassName, "min-w-[8rem]")}
                >
                  <option value="latest">{blog.sortOptions.latest}</option>
                  <option value="oldest">{blog.sortOptions.oldest}</option>
                  <option value="title">{blog.sortOptions.title}</option>
                </select>
              </div>
            </div>
          )}

          {filteredAndSortedPosts.length === 0 ? (
            <Text variant="muted">
              {posts.length === 0
                ? blog.emptyState
                : `No posts found in "${selectedCategory === "all" ? blog.allCategories : selectedCategory}" category.`}
            </Text>
          ) : (
            <MotionRevealGroup className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
              {filteredAndSortedPosts.map((post, index) => (
                <MotionReveal key={post.slug} variant="fade-up" distance="sm">
                  <BlogCard
                    slug={post.slug}
                    title={post.frontmatter.title}
                    date={post.frontmatter.date}
                    image={post.frontmatter.image}
                    priority={index < 6}
                  />
                </MotionReveal>
              ))}
            </MotionRevealGroup>
          )}
        </Container>
      </Section>
    </>
  );
}
