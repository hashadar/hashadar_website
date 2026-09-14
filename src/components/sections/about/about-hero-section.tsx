"use client";

import Image from "next/image";
import { Heading, MotionReveal, Text } from "@/components/ui";

interface AboutHeroSectionProps {
  heading: string;
  lede: string[];
  linkedinHref?: string;
  portrait?: {
    src: string;
    alt: string;
  };
}

function LedeParagraph({
  text,
  linkedinHref,
}: {
  text: string;
  linkedinHref?: string;
}) {
  if (!linkedinHref || !text.includes("LinkedIn")) {
    return (
      <Text size="lg" className="leading-relaxed text-[var(--foreground)]">
        {text}
      </Text>
    );
  }

  const [before, after] = text.split("LinkedIn");

  return (
    <Text size="lg" className="leading-relaxed text-[var(--foreground)]">
      {before}
      <a
        href={linkedinHref}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-[var(--foreground)] underline-offset-4 hover:text-[var(--primary)] hover:underline"
      >
        LinkedIn
      </a>
      {after}
    </Text>
  );
}

export function AboutHeroSection({
  heading,
  lede,
  linkedinHref,
  portrait,
}: AboutHeroSectionProps) {
  return (
    <section className="flex min-h-screen min-h-[100dvh] flex-col bg-[var(--cream)] px-7 pt-28 pb-16 min-[900px]:px-12 min-[900px]:pt-36 min-[900px]:pb-24">
      <div className="grid w-full items-start gap-10 min-[900px]:grid-cols-12 min-[900px]:items-center min-[900px]:gap-16">
        <div className="min-[900px]:col-span-7">
          <MotionReveal variant="fade-up" distance="sm" inView={false}>
            <Heading
              as="h1"
              size="sm"
              className="font-semibold tracking-[-0.04em] text-[var(--mono-500)]"
            >
              {heading}
            </Heading>
          </MotionReveal>

          <div className="mt-8 max-w-[46rem] space-y-5">
            {lede.map((paragraph, index) => (
              <MotionReveal
                key={paragraph}
                variant="fade-up"
                distance="sm"
                delay={0.08 * (index + 1)}
                inView={false}
              >
                <LedeParagraph text={paragraph} linkedinHref={linkedinHref} />
              </MotionReveal>
            ))}
          </div>
        </div>

        {portrait ? (
          <div className="mx-auto w-full max-w-[18rem] min-[900px]:col-span-5 min-[900px]:mx-0 min-[900px]:max-w-none min-[900px]:justify-self-end">
            <Image
              src={portrait.src}
              alt={portrait.alt}
              width={1200}
              height={1800}
              sizes="(max-width: 899px) 18rem, 36vw"
              className="h-auto max-h-[min(52vh,28rem)] w-auto max-w-full grayscale min-[900px]:max-h-[min(72vh,42rem)]"
              quality={85}
              priority
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
