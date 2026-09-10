import Link from "next/link";
import { Loop } from "@/components/ui";
import type { HomeProof, ProofDoor } from "@/data/types";

interface ProofSectionProps {
  proof: HomeProof;
}

const TILE_SIZES = "(max-width: 899px) 100vw, 50vw";

function ProofTile({ door }: { door: ProofDoor }) {
  return (
    <Link
      href={door.href}
      className="proof-tile relative flex min-h-[58vh] items-end overflow-hidden p-6 text-[var(--mono-50)] min-[900px]:min-h-0"
    >
      <Loop
        src={door.src}
        sizes={TILE_SIZES}
        tone={door.media === "photo" ? "photograph" : "chrome"}
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/62 via-black/[0.08] to-transparent"
        aria-hidden="true"
      />
      <span className="proof-label relative z-[2] origin-bottom-left font-body text-[1.15rem] font-semibold tracking-[-0.03em]">
        {door.label}
      </span>
    </Link>
  );
}

export function ProofSection({ proof }: ProofSectionProps) {
  return (
    <section
      id="proof"
      className="grid min-h-screen grid-cols-1 min-[900px]:min-h-[110vh] min-[900px]:grid-cols-2 min-[900px]:grid-rows-2"
    >
      {proof.doors.map((door) => (
        <ProofTile key={door.id} door={door} />
      ))}
    </section>
  );
}
