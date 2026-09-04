"use client";

import { SectionHeader, Text, Container, Section, SectionBackground, PhotoCard, Lightbox, Button, MotionReveal } from "@/components/ui";
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
          <SectionHeader animated={false} showBottomAccent>
            {heading}
          </SectionHeader>

          {description && (
            <MotionReveal variant="fade" className="mx-auto max-w-2xl text-center">
              <Text size="lg" className="text-[var(--foreground)]/80">
                {description}
              </Text>
            </MotionReveal>
          )}

          {images.length > 0 && (
            <MotionReveal variant="fade" className="flex justify-center">
              <div className="w-full max-w-4xl">
                <PhotoCard
                  src={images[0].src}
                  alt={images[0].alt}
                  title={images[0].title}
                  category={images[0].category}
                  location={images[0].location}
                  priority={true}
                  sizes="(max-width: 640px) 100vw, (max-width: 1280px) 90vw, 1200px"
                  aspectRatio="auto"
                  width={1200}
                  height={800}
                  showOverlay={true}
                  onClick={openLightbox}
                />
              </div>
            </MotionReveal>
          )}

          <MotionReveal variant="fade-up" distance="sm" className="relative z-10 flex justify-center pt-8">
            <Button href="/portfolio" variant="primary" size="md">
              View Full Portfolio
            </Button>
          </MotionReveal>
        </div>
      </Container>

      <Lightbox
        isOpen={lightboxOpen}
        images={images}
        currentIndex={0}
        onClose={closeLightbox}
      />
    </Section>
  );
}
