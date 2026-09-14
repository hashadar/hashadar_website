"use client";

import Image from "next/image";
import { PageIntro } from "@/components/sections/shared/page-intro";

interface AboutHeroSectionProps {
  name: string;
  title: string;
  portrait?: {
    src: string;
    alt: string;
  };
}

export function AboutHeroSection({
  name,
  title,
  portrait,
}: AboutHeroSectionProps) {
  return (
    <PageIntro
      heading={name}
      lede={title}
      media={
        portrait ? (
          <Image
            src={portrait.src}
            alt={portrait.alt}
            width={1200}
            height={1800}
            sizes="(max-width: 899px) 18rem, 28vw"
            className="h-auto max-h-[min(52vh,28rem)] w-auto max-w-full grayscale min-[900px]:max-h-[min(64vh,36rem)]"
            quality={85}
            priority
          />
        ) : undefined
      }
    />
  );
}
