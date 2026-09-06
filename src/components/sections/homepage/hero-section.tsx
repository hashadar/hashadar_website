"use client";

import { Heading, Loop } from "@/components/ui";
import type { ClaimRole, HomeClaim } from "@/data/types";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { fitClaimLockup } from "@/components/sections/homepage/fit-claim-lockup";

const ROLE_START_MS = 700;
const ROLE_STEP_MS = 1100;

const roleLineClassName =
  "relative z-[3] min-h-[1.4em] px-6 font-body text-[clamp(1.1rem,2.4vw,1.85rem)] font-semibold tracking-[-0.03em] text-[var(--foreground)]";

interface HeroSectionProps {
  claim: HomeClaim;
}

function staticRolesText(roles: ClaimRole[]) {
  return roles.map((role) => role.question).join(" ");
}

function ClaimRoles({ roles }: { roles: ClaimRole[] }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const sequence = roles.map((role) => role.question);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion || sequence.length === 0) return;

    let step = 0;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      step = (step + 1) % sequence.length;
      setIndex(step);
      timer = setTimeout(tick, ROLE_STEP_MS);
    };

    timer = setTimeout(tick, ROLE_START_MS);
    return () => clearTimeout(timer);
  }, [prefersReducedMotion, roles, sequence.length]);

  const staticText = staticRolesText(roles);

  if (prefersReducedMotion) {
    return <p className={roleLineClassName}>{staticText}</p>;
  }

  return (
    <>
      <p className="sr-only">{staticText}</p>
      <p className={roleLineClassName} aria-hidden="true">
        {sequence[index]}
      </p>
    </>
  );
}

export function HeroSection({ claim }: HeroSectionProps) {
  const lockupRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const lockup = lockupRef.current;
    if (!lockup) return;

    const fit = () => fitClaimLockup(lockup);
    fit();
    void document.fonts?.ready.then(fit);
    document.fonts?.addEventListener?.("loadingdone", fit);

    if (typeof ResizeObserver === "undefined") {
      return () => document.fonts?.removeEventListener?.("loadingdone", fit);
    }

    const observer = new ResizeObserver(fit);
    observer.observe(lockup);
    return () => {
      observer.disconnect();
      document.fonts?.removeEventListener?.("loadingdone", fit);
    };
  }, [claim.lockup]);

  return (
    <section
      id="claim"
      className="relative flex min-h-screen min-h-[100dvh] flex-col justify-end overflow-hidden bg-[var(--background)] pb-9"
    >
      <Loop src={claim.loopSrc} objectPosition={claim.loopObjectPosition} />
      <div
        ref={lockupRef}
        data-claim-lockup
        className="pointer-events-none absolute inset-x-0 top-11 bottom-10 z-[2] overflow-visible"
      >
        <Heading
          size="hero"
          className="flex h-full w-full flex-col justify-start overflow-visible break-normal font-semibold"
          style={{
            fontSize: "22vw",
            lineHeight: 0.8,
            letterSpacing: "-0.04em",
            fontWeight: 600,
          }}
        >
          {claim.lockup.map((line) => (
            <span key={line} className="block w-max max-w-none whitespace-nowrap leading-[0.8]">
              {line}
            </span>
          ))}
        </Heading>
      </div>
      <ClaimRoles roles={claim.roles} />
    </section>
  );
}
