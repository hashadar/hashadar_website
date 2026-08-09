'use client';

import Link from 'next/link';
import { Container, Heading, Text } from '@/components/ui';
import { labs } from '@/data';
import { usePrefersReducedMotion } from '@/hooks/use-prefers-reduced-motion';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const springEnter = { type: 'spring' as const, damping: 26, stiffness: 90 };

function LabsStageAtmosphere() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_-10%,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_60%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--foreground)_2.5%,transparent),transparent_45%)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--background)] to-transparent" />
    </div>
  );
}

export function LabsIndexSection() {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <section className="relative flex min-h-[calc(100vh-5rem)] items-center overflow-hidden">
      <LabsStageAtmosphere />

      <Container className="relative z-10 w-full py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <motion.div
            className="max-w-2xl"
            initial={
              prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 18 }
            }
            animate={{ opacity: 1, y: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { ...springEnter, duration: 0.7 }
            }
          >
            <p className="mb-4 font-body text-xs font-medium uppercase tracking-[0.14em] text-[var(--primary)]">
              {labs.brandEyebrow}
            </p>
            <Heading size="hero" className="hero-text pb-[0.08em]">
              {labs.heading}
            </Heading>
            <Text className="mt-5 max-w-xl text-base text-[var(--mono-500)] sm:text-lg">
              {labs.purposeLine}
            </Text>
          </motion.div>

          <motion.nav
            className="mt-12 sm:mt-14"
            aria-label={labs.catalogueAriaLabel}
            initial={
              prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 24 }
            }
            animate={{ opacity: 1, y: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { ...springEnter, delay: 0.15, duration: 0.75 }
            }
          >
            <ul className="grid gap-4 sm:grid-cols-2 sm:gap-5">
              {labs.labs.map((lab, index) => (
                <li key={lab.href}>
                  <Link
                    href={lab.href}
                    className={cn(
                      'group flex h-full flex-col justify-between rounded-xl border border-[var(--border)] bg-[color-mix(in_oklab,var(--background)_88%,var(--primary)_4%)] px-5 py-5 transition-colors',
                      'hover:border-[color-mix(in_oklab,var(--primary)_35%,var(--border))] hover:bg-[color-mix(in_oklab,var(--background)_82%,var(--primary)_8%)]',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_oklab,var(--primary)_40%,transparent)]',
                    )}
                  >
                    <motion.div
                      initial={
                        prefersReducedMotion
                          ? false
                          : { opacity: 0, y: 12 }
                      }
                      animate={{ opacity: 1, y: 0 }}
                      transition={
                        prefersReducedMotion
                          ? { duration: 0 }
                          : {
                              ...springEnter,
                              delay: 0.22 + index * 0.08,
                              duration: 0.65,
                            }
                      }
                    >
                      <Heading
                        size="sm"
                        as="h2"
                        className="text-[var(--foreground)] transition-colors group-hover:text-[var(--primary)]"
                      >
                        {lab.title}
                      </Heading>
                      <p className="mt-2 font-body text-sm text-[var(--foreground)] sm:text-[0.95rem]">
                        {lab.lede}
                      </p>
                      <Text className="mt-1 text-sm text-[var(--mono-500)] sm:text-[0.95rem]">
                        {lab.description}
                      </Text>
                    </motion.div>
                    <span className="mt-6 inline-flex items-center gap-1.5 font-body text-sm font-medium text-[var(--primary)]">
                      {lab.ctaLabel}
                      <span
                        aria-hidden
                        className="transition-transform group-hover:translate-x-0.5"
                      >
                        →
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.nav>
        </div>
      </Container>
    </section>
  );
}
