"use client";

import { Heading, MotionReveal, Text } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { AboutCareerSeat, AboutCareerViews } from "@/data";

const foldColumns =
  "grid grid-cols-1 gap-10 min-[900px]:grid-cols-3 min-[900px]:gap-x-12";

function SeatTimeline({ current }: { current: AboutCareerSeat }) {
  return (
    <ol
      aria-label={`Roles at ${current.name}`}
      className={cn("relative mt-12 min-[900px]:mt-16", foldColumns)}
    >
      <span
        aria-hidden="true"
        className="absolute top-0 bottom-0 left-[0.34rem] w-px bg-[var(--border)] min-[900px]:top-[0.34rem] min-[900px]:right-0 min-[900px]:bottom-auto min-[900px]:left-0 min-[900px]:h-px min-[900px]:w-auto"
      />

      {current.titles.map((title, index) => {
        const isCurrent = title.current;

        return (
          <li
            key={title.role}
            aria-current={isCurrent ? true : undefined}
            className="relative pl-8 min-[900px]:pl-0 min-[900px]:pt-8"
          >
            <MotionReveal variant="fade-up" distance="sm" delay={0.06 * (index + 1)}>
              <span
                aria-hidden="true"
                className={cn(
                  "absolute left-0 top-1.5 block rounded-full min-[900px]:top-0 min-[900px]:left-0",
                  isCurrent
                    ? "h-3 w-3 bg-[var(--primary)]"
                    : "h-[0.7rem] w-[0.7rem] bg-[var(--background)] ring-1 ring-[var(--mono-500)]",
                )}
              />

              {isCurrent ? (
                <div className="min-[900px]:-mt-1">
                  <Text
                    variant="accent"
                    size="xs"
                    className="font-semibold tracking-[0.12em] uppercase"
                  >
                    Now
                  </Text>
                  <Heading
                    as="h3"
                    size="md"
                    className="mt-2 font-semibold tracking-[-0.04em]"
                    style={{
                      fontSize: "clamp(2rem, 5vw, 4.25rem)",
                      lineHeight: 0.9,
                      letterSpacing: "-0.05em",
                    }}
                  >
                    {title.role}
                  </Heading>
                  <Text variant="muted" size="xs" className="mt-3">
                    {title.period}
                  </Text>
                </div>
              ) : (
                <div>
                  <Text
                    variant="muted"
                    size="sm"
                    className="font-semibold tracking-[-0.03em] text-[1.05rem]"
                  >
                    {title.role}
                  </Text>
                  <Text variant="muted" size="xs" className="mt-2">
                    {title.period}
                  </Text>
                </div>
              )}
            </MotionReveal>
          </li>
        );
      })}
    </ol>
  );
}

export function CareerRecord({
  current,
  earlier,
  certifications,
}: AboutCareerViews) {
  return (
    <section className="flex min-h-screen flex-col bg-[var(--background)] px-7 pt-28 pb-20 min-[900px]:px-12 min-[900px]:pt-32 min-[900px]:pb-24">
      <div className="flex flex-1 flex-col justify-between gap-16 min-[900px]:gap-24">
        {current ? (
          <div>
            <MotionReveal variant="fade-up" distance="md">
              <Heading
                as="h2"
                size="lg"
                className="font-semibold tracking-[-0.05em]"
                style={{
                  fontSize: "clamp(3.25rem, 10vw, 7.5rem)",
                  lineHeight: 0.85,
                  letterSpacing: "-0.06em",
                }}
              >
                {current.name}
              </Heading>
            </MotionReveal>

            <MotionReveal variant="fade-up" distance="sm" delay={0.08}>
              <div className="mt-4 space-y-2 min-[900px]:mt-6">
                {current.department ? (
                  <Text size="sm" className="tracking-[-0.02em]">
                    {current.department}
                  </Text>
                ) : null}
                <Text variant="muted" size="xs" className="tracking-[-0.02em]">
                  {current.period}
                  <span aria-hidden="true"> · </span>
                  {current.location}
                </Text>
              </div>
            </MotionReveal>

            <SeatTimeline current={current} />
          </div>
        ) : null}

        {earlier.length > 0 || certifications.length > 0 ? (
          <div className="border-t border-[var(--border)] pt-10 min-[900px]:pt-12">
            <div className={foldColumns}>
              {earlier.map((fact) => (
                <MotionReveal key={fact.name} variant="fade-up" distance="sm">
                  <Text size="sm" className="font-semibold tracking-[-0.03em]">
                    {fact.name}
                  </Text>
                  <Text variant="muted" size="xs" className="mt-1">
                    {fact.detail}
                  </Text>
                  <Text variant="muted" size="xs" className="mt-1">
                    {fact.period}
                  </Text>
                </MotionReveal>
              ))}

              {certifications.length > 0 ? (
                <MotionReveal variant="fade-up" distance="sm">
                  <ul className="space-y-2" aria-label="Certifications">
                    {certifications.map((item) => (
                      <li key={item.name}>
                        <Text size="sm" className="tracking-[-0.02em]">
                          {item.name}
                        </Text>
                      </li>
                    ))}
                  </ul>
                </MotionReveal>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
