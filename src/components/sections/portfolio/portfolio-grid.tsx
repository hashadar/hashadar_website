"use client";

import {
  Container,
  Section,
  PhotoCard,
  Lightbox,
  MotionReveal,
  MotionRevealGroup,
  Text,
} from "@/components/ui";
import { PageIntro } from "@/components/sections/shared/page-intro";
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
    if (typeof window !== "undefined") {
      images.forEach((image) => {
        const img = new window.Image();
        img.src = image.src;
      });
    }
  }, [images]);

  return (
    <>
      <PageIntro heading={portfolio.heading} lede={portfolio.description} />

      <Section>
        <Container>
          {images.length === 0 ? (
            <Text variant="muted">No photos yet.</Text>
          ) : (
            <MotionRevealGroup className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-10">
              {images.map((image, index) => (
                <MotionReveal
                  key={`${image.src}-${index}`}
                  variant="fade-up"
                  distance="sm"
                >
                  <PhotoCard
                    src={image.src}
                    alt={image.alt}
                    title={image.title}
                    category={image.category}
                    location={image.location}
                    aspectRatio="2/3"
                    showOverlay={true}
                    priority={index < 2}
                    sizes="(max-width: 768px) 100vw, 50vw"
                    onClick={() => openLightbox(index)}
                    onMouseEnter={() => {
                      if (typeof window !== "undefined") {
                        const img = new window.Image();
                        img.src = image.src;
                      }
                    }}
                  />
                </MotionReveal>
              ))}
            </MotionRevealGroup>
          )}
        </Container>
      </Section>

      <Lightbox
        isOpen={lightboxOpen}
        images={images}
        currentIndex={currentImageIndex}
        onClose={closeLightbox}
        onNext={nextImage}
        onPrevious={previousImage}
      />
    </>
  );
}
