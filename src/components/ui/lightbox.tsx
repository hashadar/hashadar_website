"use client";

import Image from "next/image";
import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { motionDurations, motionEasings } from "@/lib/motion/tokens";

interface LightboxImage {
  src: string;
  alt: string;
  title?: string;
  category?: string;
  location?: string;
}

interface LightboxProps {
  isOpen: boolean;
  images: LightboxImage[];
  currentIndex: number;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

export function Lightbox({
  isOpen,
  images,
  currentIndex,
  onClose,
  onNext,
  onPrevious,
}: LightboxProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const currentImage = images[currentIndex];
  const hasMultipleImages = images.length > 1;

  const nextIndex = (currentIndex + 1) % images.length;
  const prevIndex = (currentIndex - 1 + images.length) % images.length;

  const fadeTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: motionDurations.fast, ease: motionEasings.out };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          if (onPrevious) onPrevious();
          break;
        case "ArrowRight":
          if (onNext) onNext();
          break;
      }
    },
    [isOpen, onClose, onNext, onPrevious],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, handleKeyDown]);

  if (!currentImage) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
          transition={fadeTransition}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={onClose}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-2 text-white hover:text-[var(--primary)] transition-colors"
            aria-label="Close lightbox"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-8 h-8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {hasMultipleImages && onPrevious && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrevious();
              }}
              className="absolute left-4 z-50 p-3 text-white hover:text-[var(--primary)] transition-colors"
              aria-label="Previous image"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-10 h-10"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5L8.25 12l7.5-7.5"
                />
              </svg>
            </button>
          )}

          {hasMultipleImages && onNext && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              className="absolute right-4 z-50 p-3 text-white hover:text-[var(--primary)] transition-colors"
              aria-label="Next image"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-10 h-10"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 4.5l7.5 7.5-7.5 7.5"
                />
              </svg>
            </button>
          )}

          <motion.div
            initial={prefersReducedMotion ? false : { scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={prefersReducedMotion ? { opacity: 1 } : { scale: 0.96, opacity: 0 }}
            transition={fadeTransition}
            className="relative max-w-7xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <Image
                src={currentImage.src}
                alt={currentImage.alt}
                width={1600}
                height={1200}
                className="max-w-full max-h-[75vh] w-auto h-auto object-contain"
                sizes="(max-width: 1280px) 100vw, 1280px"
                quality={90}
                priority
                loading="eager"
              />
            </div>

            {hasMultipleImages && (
              <div className="hidden">
                <Image
                  src={images[nextIndex]?.src}
                  alt={images[nextIndex]?.alt || ""}
                  width={1600}
                  height={1200}
                  quality={90}
                  priority
                  loading="eager"
                />
                <Image
                  src={images[prevIndex]?.src}
                  alt={images[prevIndex]?.alt || ""}
                  width={1600}
                  height={1200}
                  quality={90}
                  priority
                  loading="eager"
                />
              </div>
            )}

            {(currentImage.title || currentImage.category || currentImage.location) && (
              <div className="mt-4 text-center">
                {currentImage.title && (
                  <h3 className="text-white font-body font-bold text-xl mb-2">
                    {currentImage.title}
                  </h3>
                )}
                {(currentImage.category || currentImage.location) && (
                  <div className="flex gap-4 text-base justify-center">
                    {currentImage.category && (
                      <span className="text-[var(--primary)] font-medium">
                        {currentImage.category}
                      </span>
                    )}
                    {currentImage.location && (
                      <span className="text-white/70">{currentImage.location}</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {hasMultipleImages && (
              <div className="mt-4 text-center text-white/50 text-sm">
                {currentIndex + 1} / {images.length}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
