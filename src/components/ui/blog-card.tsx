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
  date: string;
  image: string;
  priority?: boolean;
  className?: string;
}

export function BlogCard({
  slug,
  title,
  date,
  image,
  priority = false,
  className = "",
}: BlogCardProps) {
  const [imageError, setImageError] = useState(false);

  const formattedDate = formatBlogCardDate(date);
  const imageSrc = resolveBlogPostImage(image, { imageLoadFailed: imageError });

  return (
    <Link href={`/blog/${slug}`} className={cn("group block", className)}>
      <div className="relative aspect-[16/9] overflow-hidden bg-[var(--muted)]">
        <Image
          src={imageSrc}
          alt={title}
          fill
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          sizes="(max-width: 899px) 100vw, 50vw"
          quality={85}
          priority={priority}
          loading={priority ? "eager" : "lazy"}
          onError={() => setImageError(true)}
        />
      </div>

      <div className="mt-4 space-y-1">
        <h3 className="font-body text-xl font-bold text-[var(--foreground)] transition-colors duration-300 group-hover:text-[var(--primary)] motion-reduce:transition-none">
          {title}
        </h3>
        <p className="text-sm text-[var(--mono-500)]">{formattedDate}</p>
      </div>
    </Link>
  );
}
