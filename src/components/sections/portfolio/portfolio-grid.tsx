"use client";

import { SectionHeader, Container, Section, PhotoCard, Lightbox } from "@/components/ui";
import { portfolio } from "@/data";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useState } from "react";

export function PortfolioGrid() {
  const prefersReducedMotion = usePrefersReducedMotion();
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
            <motion.div
              key={index}
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : { 
                duration: 0.5, 
                delay: index * 0.1,
                ease: "easeOut" 
              }}
            >
              <PhotoCard
                src={image.src}
                alt={image.alt}
                title={image.title}
                category={image.category}
                location={image.location}
                aspectRatio="2/3"
                showOverlay={true}
                onClick={() => openLightbox(index)}
              />
            </motion.div>
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

