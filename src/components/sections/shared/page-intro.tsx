"use client";

import type { CSSProperties, ReactNode } from "react";
import { Container, Heading, MotionReveal, Text } from "@/components/ui";
import { cn } from "@/lib/utils";

export const interiorTitleStyle: CSSProperties = {
  fontSize: "clamp(3rem, 8vw, 5.5rem)",
  lineHeight: 0.9,
  letterSpacing: "-0.05em",
};

export interface PageIntroProps {
  heading: string;
  lede?: ReactNode;
  media?: ReactNode;
  eyebrow?: ReactNode;
  className?: string;
}

export function PageIntro({
  heading,
  lede,
  media,
  eyebrow,
  className,
}: PageIntroProps) {
  return (
    <section
      className={cn("bg-[var(--cream)] pt-28 pb-16 md:pt-36 md:pb-24", className)}
    >
      <Container>
        <div
          className={cn(
            media &&
              "grid items-center gap-10 min-[900px]:grid-cols-12 min-[900px]:gap-16",
          )}
        >
          <div className={media ? "min-[900px]:col-span-7" : undefined}>
            {eyebrow ? <div className="mb-8">{eyebrow}</div> : null}

            <MotionReveal variant="fade-up" distance="md" inView={false}>
              <Heading
                as="h1"
                size="xl"
                className="font-semibold tracking-[-0.05em]"
                style={interiorTitleStyle}
              >
                {heading}
              </Heading>
            </MotionReveal>

            {lede ? (
              <MotionReveal
                variant="fade-up"
                distance="sm"
                delay={0.1}
                inView={false}
                className="mt-6 max-w-[32rem]"
              >
                {typeof lede === "string" ? (
                  <Text
                    size="sm"
                    className="text-[1.05rem] leading-snug text-[var(--foreground)]"
                  >
                    {lede}
                  </Text>
                ) : (
                  lede
                )}
              </MotionReveal>
            ) : null}
          </div>

          {media ? (
            <div className="mx-auto w-full max-w-[18rem] min-[900px]:col-span-5 min-[900px]:mx-0 min-[900px]:max-w-none min-[900px]:justify-self-end">
              {media}
            </div>
          ) : null}
        </div>
      </Container>
    </section>
  );
}

export function InteriorHeading({
  children,
  id,
  as = "h2",
}: {
  children: ReactNode;
  id?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <MotionReveal variant="fade-up" distance="sm">
      <Heading
        as={as}
        size="sm"
        id={id}
        className="font-semibold tracking-[-0.04em] text-[var(--mono-500)]"
      >
        {children}
      </Heading>
    </MotionReveal>
  );
}
