import {
  BlogCard,
  MotionReveal,
  MotionRevealGroup,
  Text,
} from "@/components/ui";
import { PageIntro } from "@/components/sections/shared/page-intro";
import { blog } from "@/data";
import type { BlogPost } from "@/data/types";

export type BlogGridProps = {
  posts: BlogPost[];
};

function newestFirst(posts: BlogPost[]): BlogPost[] {
  return [...posts].sort(
    (a, b) =>
      new Date(b.frontmatter.date).getTime() -
      new Date(a.frontmatter.date).getTime(),
  );
}

export function BlogGrid({ posts }: BlogGridProps) {
  const listing = newestFirst(posts);

  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col bg-[var(--cream)]">
      <PageIntro
        heading={blog.heading}
        lede={blog.description}
        flush
        className="bg-transparent pb-8 min-[900px]:pb-10"
      />

      <nav
        aria-label={blog.catalogueAriaLabel}
        className="flex flex-1 flex-col px-7 pb-24 min-[900px]:px-12 min-[900px]:pb-32"
      >
        {listing.length === 0 ? (
          <Text variant="muted">{blog.emptyState}</Text>
        ) : (
          <MotionRevealGroup className="grid grid-cols-1 gap-10 min-[900px]:grid-cols-2 min-[900px]:gap-x-12 min-[900px]:gap-y-16">
            {listing.map((post, index) => (
              <MotionReveal key={post.slug} variant="fade-up" distance="sm">
                <BlogCard
                  slug={post.slug}
                  title={post.frontmatter.title}
                  date={post.frontmatter.date}
                  image={post.frontmatter.image}
                  priority={index < 2}
                />
              </MotionReveal>
            ))}
          </MotionRevealGroup>
        )}
      </nav>
    </div>
  );
}
