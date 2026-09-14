import Link from "next/link";
import { Container, Heading, Text } from "@/components/ui";
import { PageIntro } from "@/components/sections/shared/page-intro";
import { labs } from "@/data";

export function LabsIndexSection() {
  return (
    <>
      <PageIntro heading={labs.heading} lede={labs.purposeLine} />

      <section className="pb-24 md:pb-32">
        <Container>
          <nav aria-label={labs.catalogueAriaLabel}>
            <ul className="grid gap-12 sm:grid-cols-2 sm:gap-16">
              {labs.labs.map((lab) => (
                <li key={lab.href}>
                  <Link
                    href={lab.href}
                    className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-4"
                  >
                    <Heading
                      size="sm"
                      as="h2"
                      className="text-[var(--foreground)] transition-colors group-hover:text-[var(--primary)] motion-reduce:transition-none"
                    >
                      {lab.title}
                    </Heading>
                    <Text className="mt-3 text-[1.05rem] leading-snug">
                      {lab.lede}
                    </Text>
                    <Text variant="muted" size="sm" className="mt-2">
                      {lab.description}
                    </Text>
                    <span className="mt-6 inline-flex items-center gap-1.5 font-body text-sm font-medium text-[var(--primary)]">
                      {lab.ctaLabel}
                      <span aria-hidden className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none">
                        →
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </Container>
      </section>
    </>
  );
}
