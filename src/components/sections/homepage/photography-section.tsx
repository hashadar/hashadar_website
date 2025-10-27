"use client";

import { SectionHeader, Text, Container, Section, SectionBackground } from "@/components/ui";
import Image from "next/image";
import { useState } from "react";

interface PhotoItem {
  src: string;
  alt: string;
  title: string;
  category?: string;
}

interface PhotographySectionProps {
  heading: string;
  images: PhotoItem[];
}

export function PhotographySection({ heading, images }: PhotographySectionProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Create compact layout optimized for 3 images
  const getGridClass = (index: number) => {
    const patterns = [
      "col-span-2 sm:col-span-2 lg:col-span-2 row-span-2", // Large featured image (left side)
      "col-span-1 sm:col-span-1 lg:col-span-1 row-span-1", // Small square (top right)
      "col-span-1 sm:col-span-1 lg:col-span-1 row-span-1", // Small square (bottom right)
    ];
    return patterns[index];
  };

  return (
    <Section id="photography" className="relative overflow-hidden">
      <SectionBackground variant="photography" />
      
      <Container>
        <div className="space-y-12 md:space-y-16">
          {/* Header with angular styling */}
          <SectionHeader animated={false} showBottomAccent>
            {heading}
          </SectionHeader>

          {/* Compact Angular Grid for 3 Images */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 grid-rows-2 gap-3 sm:gap-4 md:gap-6 h-[350px] sm:h-[450px] md:h-[550px]">
            {images.map((image, index) => (
              <div
                key={index}
                tabIndex={0}
                role="img"
                aria-label={`${image.title} - ${image.alt}`}
                className={`group relative overflow-hidden bg-[var(--muted)] transition-all duration-700 ease-out ${
                  getGridClass(index)
                } ${
                  hoveredIndex === index 
                    ? 'scale-105 z-20 shadow-2xl' 
                    : hoveredIndex !== null 
                      ? 'scale-95 opacity-70' 
                      : 'hover:scale-102'
                }`}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                onFocus={() => setHoveredIndex(index)}
                onBlur={() => setHoveredIndex(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setHoveredIndex(hoveredIndex === index ? null : index);
                  }
                }}
                style={{
                  transform: hoveredIndex === index 
                    ? 'perspective(1000px) rotateX(2deg) rotateY(-2deg)' 
                    : 'perspective(1000px) rotateX(0deg) rotateY(0deg)'
                }}
                // Touch-friendly interactions for mobile
                onTouchStart={() => setHoveredIndex(index)}
                onTouchEnd={() => setHoveredIndex(null)}
              >
                {/* Angular overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/20 z-10" />
                
                {/* Geometric accent */}
                <div className="absolute top-2 right-2 sm:top-4 sm:right-4 w-4 h-4 sm:w-6 sm:h-6 border-2 border-[var(--primary)] transform rotate-45 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20" />
                
                {/* Image */}
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 66vw, 50vw"
                  quality={95}
                  priority={index === 0}
                />
                
                {/* Content overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-20" />
                
                {/* Title and category */}
                <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 md:p-6 transform translate-y-full group-hover:translate-y-0 transition-transform duration-500 z-30">
                  <div className="space-y-1 sm:space-y-2">
                    {image.category && (
                      <Text size="sm" className="text-[var(--primary)] font-medium uppercase tracking-wider text-xs sm:text-sm">
                        {image.category}
                      </Text>
                    )}
                    <Text className="text-white font-medium text-base sm:text-lg md:text-xl">
                      {image.title}
                    </Text>
                  </div>
                </div>

                {/* Angular border effect */}
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-[var(--primary)] transition-colors duration-500" 
                     style={{
                       clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 20px 100%, 0 calc(100% - 20px))'
                     }} />
              </div>
            ))}
          </div>

          {/* Bottom accent with reduced spacing */}
          <div className="flex justify-center pt-8">
            <div className="w-24 h-px bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent" />
          </div>
        </div>
      </Container>
    </Section>
  );
}