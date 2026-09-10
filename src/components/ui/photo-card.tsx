"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface PhotoCardProps {
  src: string;
  alt: string;
  title?: string;
  category?: string;
  location?: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
  showOverlay?: boolean;
  aspectRatio?: "auto" | "2/3";
  width?: number;
  height?: number;
  onClick?: () => void;
  onMouseEnter?: () => void;
}

const imageMotionClass =
  "transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100";

function PhotoCardChrome({
  title,
  category,
  location,
  showOverlay,
}: Pick<PhotoCardProps, "title" | "category" | "location" | "showOverlay">) {
  if (!showOverlay) {
    return null;
  }

  const hasCaption = Boolean(title || category || location);

  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none" />

      {hasCaption && (
        <div className="absolute inset-x-0 bottom-0 translate-y-full p-6 opacity-100 transition-transform duration-300 group-hover:translate-y-0 motion-reduce:translate-y-0 motion-reduce:opacity-0 motion-reduce:transition-none motion-reduce:group-hover:opacity-100">
          {title && (
            <h3 className="mb-2 font-body text-xl font-bold text-white">
              {title}
            </h3>
          )}
          {(category || location) && (
            <div className="flex gap-3 text-sm">
              {category && (
                <span className="font-medium text-[var(--primary)]">
                  {category}
                </span>
              )}
              {location && (
                <span className="text-white/80">
                  {location}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 border-2 border-transparent transition-colors duration-300 group-hover:border-[var(--primary)] motion-reduce:transition-none" />
    </>
  );
}

export function PhotoCard({
  src,
  alt,
  title,
  category,
  location,
  priority = false,
  sizes = "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw",
  className = "",
  showOverlay = true,
  aspectRatio = "2/3",
  width,
  height,
  onClick,
  onMouseEnter,
}: PhotoCardProps) {
  const isAuto = aspectRatio === "auto" && Boolean(width && height);

  return (
    <div
      className={cn(
        "group relative cursor-pointer overflow-hidden bg-[var(--muted)]",
        isAuto ? "" : "aspect-[2/3]",
        className,
      )}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      {isAuto ? (
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={cn("h-auto w-full", imageMotionClass)}
          sizes={sizes}
          quality={85}
          priority={priority}
          loading={priority ? "eager" : "lazy"}
        />
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          className={cn("object-cover", imageMotionClass)}
          sizes={sizes}
          quality={85}
          priority={priority}
          loading={priority ? "eager" : "lazy"}
        />
      )}

      <PhotoCardChrome
        title={title}
        category={category}
        location={location}
        showOverlay={showOverlay}
      />
    </div>
  );
}
