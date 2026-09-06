import Image from "next/image";
import { Button, Heading, Text } from "@/components/ui";
import type { HomeStatement } from "@/data/types";

interface StatementSectionProps {
  statement: HomeStatement;
}

function ContinueChevron() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="statement-continue-chevron h-4 w-4 shrink-0"
    >
      <path
        d="M3.5 6.5 8 11l4.5-4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
      />
    </svg>
  );
}

export function StatementSection({ statement }: StatementSectionProps) {
  return (
    <section
      id="statement"
      className="flex min-h-screen min-h-[100dvh] items-center bg-[var(--cream)] px-7 py-24 min-[900px]:h-[100dvh] min-[900px]:min-h-0 min-[900px]:px-12"
    >
      <div className="mx-auto grid w-full max-w-6xl items-center gap-10 min-[900px]:grid-cols-12 min-[900px]:gap-16">
        <div className="min-[900px]:col-span-7">
          <Heading
            as="h2"
            size="lg"
            className="font-semibold tracking-[-0.05em]"
            style={{
              fontSize: "clamp(3.25rem, 9vw, 6.25rem)",
              lineHeight: 0.9,
              letterSpacing: "-0.05em",
            }}
          >
            {statement.headline}
          </Heading>
          <div className="mt-6 max-w-[28rem] space-y-1">
            {statement.lines.map((line) => (
              <Text
                key={line}
                size="sm"
                className="text-[1.05rem] leading-snug text-[var(--foreground)]"
              >
                {line}
              </Text>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Button href={statement.cta.href} variant="primary" size="lg">
              {statement.cta.label}
            </Button>
            <a
              href={statement.continue.href}
              className="inline-flex items-center gap-2 font-body text-sm font-semibold tracking-[-0.03em] text-[var(--foreground)] hover:text-[var(--primary)]"
            >
              {statement.continue.label}
              <ContinueChevron />
            </a>
          </div>
        </div>
        <div className="mx-auto w-full max-w-[18rem] min-[900px]:col-span-5 min-[900px]:mx-0 min-[900px]:max-w-none min-[900px]:justify-self-end">
          <Image
            src={statement.portrait.src}
            alt={statement.portrait.alt}
            width={1200}
            height={1800}
            sizes="(max-width: 899px) 18rem, 28vw"
            className="h-auto max-h-[min(52vh,28rem)] w-auto max-w-full grayscale min-[900px]:max-h-[min(64vh,36rem)]"
            quality={85}
          />
        </div>
      </div>
    </section>
  );
}
