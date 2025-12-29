"use client";

import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { useState } from "react";

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

const FALLBACK_IMAGE = "/img/mangrove_beach.webp";

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
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const formattedDate = format(new Date(date), "MMM d, yyyy");
  
  // Determine which image to use - check for empty string, null, undefined, or whitespace
  const hasImage = image && image.trim() !== '';
  const imageSrc = (!hasImage || imageError) ? FALLBACK_IMAGE : image;
  const isPlaceholder = imageSrc === FALLBACK_IMAGE;

  return (
    <Link
      href={`/blog/${slug}`}
      className={`group block ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="relative overflow-hidden bg-[var(--muted)] border border-[var(--border)] transition-all duration-500"
        style={{
          transform: isHovered ? 'scale(1.02)' : 'scale(1)',
        }}
      >
        {/* Image */}
        <div className="relative aspect-[16/9] overflow-hidden bg-[var(--muted)]">
          <Image
            src={imageSrc}
            alt={title}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            quality={85}
            priority={priority}
            loading={priority ? "eager" : "lazy"}
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWEREiMxUf/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
            onError={() => setImageError(true)}
          />
          
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Category */}
          <div className="mb-3">
            <span className="text-[var(--primary)] font-medium text-sm uppercase tracking-wide">
              {category}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-[var(--foreground)] font-display font-bold text-xl mb-3 line-clamp-3 group-hover:text-[var(--primary)] transition-colors duration-300">
            {title}
          </h3>

          {/* Excerpt */}
          <p className="text-[var(--foreground)]/70 text-sm mb-4 line-clamp-3">
            {excerpt}
          </p>

          {/* Meta info */}
          <div className="flex items-center justify-between text-xs text-[var(--foreground)]/60">
            <span>{author}</span>
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* Border effect on hover */}
        <div className="absolute inset-0 border-2 border-transparent group-hover:border-[var(--primary)] transition-colors duration-500 pointer-events-none" />
      </div>
    </Link>
  );
}

