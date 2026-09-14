import Link from "next/link";
import { Heading, MotionReveal, Text } from "@/components/ui";
import { PageIntro } from "@/components/sections/shared/page-intro";
import { labs } from "@/data";

export function LabsIndexSection() {
  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col bg-[var(--cream)]">
      <PageIntro
        heading={labs.heading}
        lede={labs.purposeLine}
        flush
        className="bg-transparent pb-8 min-[900px]:pb-10"
      />

      <nav
        aria-label={labs.catalogueAriaLabel}
        className="flex flex-1 flex-col px-7 pb-24 min-[900px]:px-12 min-[900px]:pb-32"
      >
        <MotionReveal variant="fade-up" distance="sm">
          <ul className="border-t border-[var(--border)]">
            {labs.labs.map((lab) => (
              <li key={lab.href} className="border-b border-[var(--border)]">
                <Link
                  href={lab.href}
                  className="group block py-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-4 min-[900px]:py-10"
                >
                  <Heading
                    size="md"
                    as="h2"
                    className="font-semibold tracking-[-0.04em] text-[var(--foreground)] transition-colors group-hover:text-[var(--primary)] motion-reduce:transition-none"
                  >
                    {lab.title}
                  </Heading>
                  <Text variant="muted" size="sm" className="mt-2">
                    {lab.lede}
                  </Text>
                </Link>
              </li>
            ))}
          </ul>
        </MotionReveal>
      </nav>
    </div>
  );
}
