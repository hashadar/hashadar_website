'use client';

import { Button, Container, Heading, Text } from '@/components/ui';
import { labs } from '@/data';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const flagship = labs.labs[0];

const springEnter = { type: 'spring' as const, damping: 25, stiffness: 80 };

/** Soft green radial (job-market) plus a quiet geometric wash (home DNA, muted). */
function LabsStageAtmosphere() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--primary)_8%,transparent),transparent_55%),linear-gradient(180deg,color-mix(in_oklab,var(--foreground)_3%,transparent),transparent_40%)]" />
      <div className="absolute inset-0 geometric-pattern opacity-5" />
      <div className="absolute top-[28%] left-0 h-px w-full bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent opacity-15" />
      <div className="absolute bottom-[32%] left-0 h-px w-20 -skew-x-12 bg-[var(--primary)] opacity-20 sm:w-24" />
    </div>
  );
}

/** Abstract dots suggesting signals coalescing; decorative only. */
function LabsSignalTeaser({
  prefersReducedMotion,
  className,
}: {
  prefersReducedMotion: boolean;
  className?: string;
}) {
  const dots = [
    { cx: 18, cy: 42, r: 2.2, delay: 0 },
    { cx: 32, cy: 28, r: 1.8, delay: 0.08 },
    { cx: 48, cy: 52, r: 2, delay: 0.12 },
    { cx: 58, cy: 22, r: 1.6, delay: 0.16 },
    { cx: 72, cy: 38, r: 2.4, delay: 0.2 },
    { cx: 88, cy: 48, r: 1.7, delay: 0.24 },
    { cx: 102, cy: 30, r: 2.1, delay: 0.28 },
    { cx: 118, cy: 44, r: 3.2, delay: 0.35 },
    { cx: 128, cy: 36, r: 2.6, delay: 0.4 },
    { cx: 136, cy: 48, r: 2, delay: 0.45 },
  ];

  return (
    <figure
      className={cn('relative mx-auto w-full max-w-[11rem] sm:max-w-[13rem]', className)}
      aria-label={labs.teaserAriaLabel}
    >
      <svg
        viewBox="0 0 160 70"
        className="h-auto w-full text-[var(--primary)]"
        aria-hidden
      >
        {dots.map((dot) => (
          <motion.circle
            key={`${dot.cx}-${dot.cy}`}
            cx={dot.cx}
            cy={dot.cy}
            r={dot.r}
            fill="currentColor"
            initial={
              prefersReducedMotion
                ? { opacity: 0.35 }
                : { opacity: 0, scale: 0.6 }
            }
            animate={{ opacity: 0.35, scale: 1 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { ...springEnter, delay: 1.15 + dot.delay, duration: 0.7 }
            }
          />
        ))}
      </svg>
    </figure>
  );
}

export function LabsIndexSection() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const flagshipHref = flagship?.href ?? '/labs/job-market';
  const flagshipTitle = labs.flagshipTitle || flagship?.title || 'Job Signal Lab';

  return (
    <section className="relative flex min-h-[calc(100vh-5rem)] items-center overflow-hidden">
      <LabsStageAtmosphere />

      <Container className="relative z-10 w-full py-16 md:py-20">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <motion.p
            className="mb-6 font-body text-xs font-medium uppercase tracking-[0.14em] text-[var(--primary)] sm:mb-8"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { ...springEnter, delay: 0.1, duration: 0.6 }
            }
          >
            {labs.brandEyebrow}
          </motion.p>

          <motion.div
            className="relative mb-10 sm:mb-12"
            initial={
              prefersReducedMotion
                ? { opacity: 1 }
                : { opacity: 0, y: 100, rotateX: 15 }
            }
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { ...springEnter, duration: 1.2 }
            }
          >
            <div
              aria-hidden
              className="absolute -top-5 -left-5 h-14 w-14 -translate-x-1/4 bg-[var(--primary)] opacity-5 rotate-45 sm:-top-7 sm:-left-7 sm:h-20 sm:w-20"
            />
            <div
              aria-hidden
              className="absolute -right-2 -bottom-2 h-10 w-10 border-2 border-[var(--primary)] opacity-10 -rotate-12 sm:-right-3 sm:-bottom-3 sm:h-14 sm:w-14"
            />

            <Heading
              size="hero"
              className="relative hero-text pb-[0.12em]"
            >
              <span className="relative z-10">{labs.heading}</span>
              <motion.span
                aria-hidden
                className="absolute -right-2 -bottom-1 h-6 w-6 bg-[var(--primary)] opacity-20 rotate-45 sm:-right-3 sm:h-8 sm:w-8"
                initial={
                  prefersReducedMotion
                    ? { scale: 1, rotate: 45 }
                    : { scale: 0, rotate: 0 }
                }
                animate={{ scale: 1, rotate: 45 }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { delay: 0.9, duration: 0.8, ease: 'easeOut' }
                }
              />
            </Heading>
          </motion.div>

          <motion.div
            className="relative mb-5 max-w-xl space-y-4 sm:mb-6"
            initial={
              prefersReducedMotion
                ? { opacity: 1 }
                : { opacity: 0, y: 40, scale: 0.96 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { ...springEnter, delay: 0.55, duration: 0.9 }
            }
          >
            <div
              aria-hidden
              className="absolute top-1/2 -left-5 hidden h-px w-10 -translate-y-1/2 -skew-y-12 bg-[var(--primary)] opacity-30 sm:-left-8 sm:block sm:w-14"
            />
            <Heading
              size="md"
              as="h2"
              className="text-[var(--foreground)]"
            >
              {flagshipTitle}
            </Heading>
            <Text className="text-[var(--foreground)]">{labs.purposeLine}</Text>
          </motion.div>

          <motion.div
            className="mb-10 sm:mb-12"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { ...springEnter, delay: 1.05, duration: 0.7 }
            }
          >
            <Button href={flagshipHref} variant="primary" size="md">
              {labs.ctaLabel}
            </Button>
          </motion.div>

          <LabsSignalTeaser prefersReducedMotion={prefersReducedMotion} />
        </div>
      </Container>
    </section>
  );
}
