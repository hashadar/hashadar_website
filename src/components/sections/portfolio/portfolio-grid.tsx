"use client";

import { SectionHeader, Container, Section, PhotoCard, Lightbox, MotionReveal, Text } from "@/components/ui";
import { portfolio } from "@/data";
import type { PhotoItem } from "@/data/types";
import { useState, useEffect } from "react";

export type PortfolioGridProps = {
  images: PhotoItem[];
};

export function PortfolioGrid({ images }: PortfolioGridProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const nextImage = () => {
    if (images.length === 0) return;
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const previousImage = () => {
    if (images.length === 0) return;
    setCurrentImageIndex(
      (prev) => (prev - 1 + images.length) % images.length
    );
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      images.forEach((image) => {
        const img = new window.Image();
        img.src = image.src;
      });
    }
  }, [images]);

  return (
    <Section className="py-20">
      <Container>
        <div className="mb-16 space-y-4">
          <SectionHeader animated={false}>
            {portfolio.heading}
          </SectionHeader>
          
          <p className="text-[var(--foreground)] text-lg max-w-2xl">
            {portfolio.description}
          </p>
        </div>

        {images.length === 0 ? (
          <Text variant="muted">No photos yet.</Text>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {images.map((image, index) => (
              <MotionReveal
                key={`${image.src}-${index}`}
                variant="fade-up"
                distance="sm"
                delay={index * 0.1}
                inView={false}
              >
                <PhotoCard
                  src={image.src}
                  alt={image.alt}
                  title={image.title}
                  category={image.category}
                  location={image.location}
                  aspectRatio="2/3"
                  showOverlay={true}
                  priority={index < 3}
                  onClick={() => openLightbox(index)}
                  onMouseEnter={() => {
                    if (typeof window !== 'undefined') {
                      const img = new window.Image();
                      img.src = image.src;
                    }
                  }}
                />
              </MotionReveal>
            ))}
          </div>
        )}
      </Container>

      <Lightbox
        isOpen={lightboxOpen}
        images={images}
        currentIndex={currentImageIndex}
        onClose={closeLightbox}
        onNext={nextImage}
        onPrevious={previousImage}
      />
    </Section>
  );
}
