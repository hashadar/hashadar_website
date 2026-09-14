"use client";

import {
  PhotoCard,
  Lightbox,
  MotionReveal,
  MotionRevealGroup,
  Text,
} from "@/components/ui";
import { PageIntro } from "@/components/sections/shared/page-intro";
import { portfolio } from "@/data";
import type { PhotoItem } from "@/data/types";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

export type PortfolioGridProps = {
  images: PhotoItem[];
};

export function PortfolioGrid({ images }: PortfolioGridProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const leadStill = images.length >= 3;

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
      <PageIntro
        heading={portfolio.heading}
        lede={portfolio.description}
        flush
      />

      {images.length === 0 ? (
        <div className="bg-[var(--background)] px-7 py-16 min-[900px]:px-12">
          <Text variant="muted">No photos yet.</Text>
        </div>
      ) : (
        <MotionRevealGroup className="grid grid-cols-2 gap-[2px] bg-[var(--background)] min-[900px]:grid-cols-3">
          {images.map((image, index) => {
            const isLead = leadStill && index === 0;

            return (
              <MotionReveal
                key={`${image.src}-${index}`}
                variant="fade-up"
                distance="sm"
                className={cn(isLead && "col-span-2 min-[900px]:row-span-2")}
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
                  sizes={
                    isLead
                      ? "(max-width: 899px) 100vw, 67vw"
                      : "(max-width: 899px) 50vw, 33vw"
                  }
                  onClick={() => openLightbox(index)}
                  onMouseEnter={() => {
                    if (typeof window !== "undefined") {
                      const img = new window.Image();
                      img.src = image.src;
                    }
                  }}
                />
              </MotionReveal>
            );
          })}
        </MotionRevealGroup>
      )}

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
