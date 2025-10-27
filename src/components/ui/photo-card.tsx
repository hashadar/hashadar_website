"use client";

import Image from "next/image";
import { useState } from "react";

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
}: PhotoCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // For auto aspect ratio with width/height, use different layout
  if (aspectRatio === "auto" && width && height) {
    return (
      <div
        className={`group relative overflow-hidden bg-[var(--muted)] cursor-pointer ${className}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
        style={{
          transform: isHovered ? 'scale(1.02)' : 'scale(1)',
          transition: 'transform 0.5s ease-out'
        }}
      >
        {/* Image with explicit dimensions */}
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className="w-full h-auto transition-transform duration-700 group-hover:scale-110"
          sizes={sizes}
          quality={90}
          priority={priority}
          loading={priority ? "eager" : "lazy"}
        />
        
        {/* Overlay */}
        {showOverlay && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        )}
        
        {/* Content */}
        {(title || category || location) && showOverlay && (
          <div className="absolute inset-x-0 bottom-0 p-6 transform translate-y-full group-hover:translate-y-0 transition-transform duration-500">
            {title && (
              <h3 className="text-white font-display font-bold text-xl mb-2">
                {title}
              </h3>
            )}
            {(category || location) && (
              <div className="flex gap-3 text-sm">
                {category && (
                  <span className="text-[var(--primary)] font-medium">
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
        
        {/* Border effect on hover */}
        <div className="absolute inset-0 border-2 border-transparent group-hover:border-[var(--primary)] transition-colors duration-500 pointer-events-none" />
      </div>
    );
  }

  // For fixed aspect ratio (2/3), use fill layout
  return (
    <div
      className={`group relative aspect-[2/3] overflow-hidden bg-[var(--muted)] cursor-pointer ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      style={{
        transform: isHovered ? 'scale(1.02)' : 'scale(1)',
        transition: 'transform 0.5s ease-out'
      }}
    >
      {/* Image */}
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover transition-transform duration-700 group-hover:scale-110"
        sizes={sizes}
        quality={90}
        priority={priority}
        loading={priority ? "eager" : "lazy"}
      />
      
      {/* Overlay */}
      {showOverlay && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      )}
      
      {/* Content */}
      {(title || category || location) && showOverlay && (
        <div className="absolute inset-x-0 bottom-0 p-6 transform translate-y-full group-hover:translate-y-0 transition-transform duration-500">
          {title && (
            <h3 className="text-white font-display font-bold text-xl mb-2">
              {title}
            </h3>
          )}
          {(category || location) && (
            <div className="flex gap-3 text-sm">
              {category && (
                <span className="text-[var(--primary)] font-medium">
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

      {/* Border effect on hover */}
      <div className="absolute inset-0 border-2 border-transparent group-hover:border-[var(--primary)] transition-colors duration-500" />
    </div>
  );
}

