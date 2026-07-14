"use client";

import { SectionHeader, Container, Section, PhotoCard, Lightbox, MotionReveal } from "@/components/ui";
import { portfolio } from "@/data";
import { useState, useEffect } from "react";

export function PortfolioGrid() {
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
    setCurrentImageIndex((prev) => (prev + 1) % portfolio.images.length);
  };

  const previousImage = () => {
    setCurrentImageIndex(
      (prev) => (prev - 1 + portfolio.images.length) % portfolio.images.length
    );
  };

  // Preload all lightbox images after component mounts for instant navigation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      portfolio.images.forEach((image) => {
        const img = new window.Image();
        img.src = image.src;
      });
    }
  }, []);

  return (
    <Section className="py-20">
      <Container>
        {/* Header */}
        <div className="mb-16 space-y-4">
          <SectionHeader animated={false}>
            {portfolio.heading}
          </SectionHeader>
          
          <p className="text-[var(--foreground)] text-lg max-w-2xl">
            {portfolio.description}
          </p>
        </div>

        {/* 3-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {portfolio.images.map((image, index) => (
            <MotionReveal
              key={index}
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
                priority={index < 9}
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
      </Container>

      {/* Lightbox */}
      <Lightbox
        isOpen={lightboxOpen}
        images={portfolio.images}
        currentIndex={currentImageIndex}
        onClose={closeLightbox}
        onNext={nextImage}
        onPrevious={previousImage}
      />
    </Section>
  );
}

