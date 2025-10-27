"use client";

import { SectionHeader, Text, Container, Section, SectionBackground, PhotoCard, Lightbox } from "@/components/ui";
import { useState } from "react";

interface PhotoItem {
  src: string;
  alt: string;
  title: string;
  category?: string;
  location?: string;
}

interface PhotographySectionProps {
  heading: string;
  description?: string;
  images: PhotoItem[];
}

export function PhotographySection({ heading, description, images }: PhotographySectionProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const openLightbox = () => {
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  return (
    <Section id="photography" className="relative overflow-hidden">
      <SectionBackground variant="photography" />
      
      <Container>
        <div className="space-y-12 md:space-y-16">
          {/* Header */}
          <SectionHeader animated={false} showBottomAccent>
            {heading}
          </SectionHeader>

          {/* Description */}
          {description && (
            <div className="max-w-2xl mx-auto text-center">
              <Text size="lg" className="text-[var(--foreground)]/80">
                {description}
              </Text>
            </div>
          )}

          {/* Single Image Display */}
          {images.length > 0 && (
            <div className="flex justify-center">
              <div className="max-w-4xl w-full">
                <PhotoCard
                  src={images[0].src}
                  alt={images[0].alt}
                  title={images[0].title}
                  category={images[0].category}
                  location={images[0].location}
                  priority={true}
                  sizes="(max-width: 1280px) 100vw, 1280px"
                  aspectRatio="auto"
                  width={1200}
                  height={800}
                  showOverlay={true}
                  onClick={openLightbox}
                />
              </div>
            </div>
          )}

          {/* Bottom accent */}
          <div className="flex justify-center pt-8">
            <div className="w-24 h-px bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent" />
          </div>
        </div>
      </Container>

      {/* Lightbox */}
      <Lightbox
        isOpen={lightboxOpen}
        images={images}
        currentIndex={0}
        onClose={closeLightbox}
      />
    </Section>
  );
}