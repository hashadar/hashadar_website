import { SitePage } from "@/components/layout/site-page";
import { HeroSection } from "@/components/sections/homepage/hero-section";
import { ProofSection } from "@/components/sections/homepage/proof-section";
import { StatementSection } from "@/components/sections/homepage/statement-section";
import { home } from "@/data";

export const revalidate = 60;

export default function Home() {
  return (
    <SitePage>
      <HeroSection claim={home.claim} />
      <StatementSection statement={home.statement} />
      <ProofSection proof={home.proof} />
    </SitePage>
  );
}
