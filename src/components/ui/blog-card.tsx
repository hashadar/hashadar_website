"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  formatBlogCardDate,
  resolveBlogPostImage,
} from "@/lib/blog-presentation";

interface BlogCardProps {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  author: string;
  image: string;
  priority?: boolean;
  className?: string;
}

export function BlogCard({
  slug,
  title,
  excerpt,
  category,
  date,
  author,
  image,
  priority = false,
  className = "",
}: BlogCardProps) {
  const [imageError, setImageError] = useState(false);

  const formattedDate = formatBlogCardDate(date);
  const imageSrc = resolveBlogPostImage(image, { imageLoadFailed: imageError });

  return (
    <Link href={`/blog/${slug}`} className={cn("group block", className)}>
      <div className="relative overflow-hidden border border-[var(--border)] bg-[var(--muted)]">
        <div className="relative aspect-[16/9] overflow-hidden bg-[var(--muted)]">
          <Image
            src={imageSrc}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            quality={85}
            priority={priority}
            loading={priority ? "eager" : "lazy"}
            onError={() => setImageError(true)}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none" />
        </div>

        <div className="p-6">
          <div className="mb-3">
            <span className="text-sm font-medium uppercase tracking-wide text-[var(--primary)]">
              {category}
            </span>
          </div>

          <h3 className="mb-3 line-clamp-3 font-body text-xl font-bold text-[var(--foreground)] transition-colors duration-300 group-hover:text-[var(--primary)] motion-reduce:transition-none">
            {title}
          </h3>

          <p className="mb-4 line-clamp-3 text-sm text-[var(--foreground)]/70">
            {excerpt}
          </p>

          <div className="flex items-center justify-between text-xs text-[var(--foreground)]/60">
            <span>{author}</span>
            <span>{formattedDate}</span>
          </div>
        </div>

        <div className="pointer-events-none absolute inset-0 border-2 border-transparent transition-colors duration-300 group-hover:border-[var(--primary)] motion-reduce:transition-none" />
      </div>
    </Link>
  );
}
