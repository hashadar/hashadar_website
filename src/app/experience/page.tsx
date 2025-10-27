import { Metadata } from "next";
import { Header, SkipToContent, Container, Section, SectionHeader } from "@/components/ui";
import dynamic from "next/dynamic";
import { site, footer } from "@/data";

const FooterSection = dynamic(() => import("@/components/sections/footer-section").then(mod => ({ default: mod.FooterSection })), {
  loading: () => <div className="min-h-[400px]" />,
});

export const metadata: Metadata = {
  title: `Experience - ${site.metadata.author}`,
  description: "View my professional experience and work history.",
  openGraph: {
    title: `Experience - ${site.metadata.author}`,
    description: "View my professional experience and work history.",
    url: `${site.metadata.siteUrl}/experience`,
    type: "website",
  },
};

export default function ExperiencePage() {
  return (
    <>
      <SkipToContent />
      <Header />
      <main id="main-content" className="bg-[var(--background)] min-h-screen pt-20">
        <Section className="py-20">
          <Container>
            <SectionHeader animated={false}>
              Experience
            </SectionHeader>
            
            <div className="mt-16 max-w-2xl mx-auto text-center">
              <div className="relative p-12 border-2 border-[var(--primary)] border-dashed rounded-lg">
                <div className="absolute top-0 left-0 w-12 h-12 border-l-2 border-t-2 border-[var(--primary)]" />
                <div className="absolute top-0 right-0 w-12 h-12 border-r-2 border-t-2 border-[var(--primary)]" />
                <div className="absolute bottom-0 left-0 w-12 h-12 border-l-2 border-b-2 border-[var(--primary)]" />
                <div className="absolute bottom-0 right-0 w-12 h-12 border-r-2 border-b-2 border-[var(--primary)]" />
                
                <h2 className="font-display text-2xl font-bold text-[var(--foreground)] mb-4">
                  Under Development
                </h2>
                <p className="text-[var(--foreground)]/70">
                  This section is currently being built. Check back soon for details about my professional experience and career journey.
                </p>
              </div>
            </div>
          </Container>
        </Section>
        <FooterSection {...footer.contact} />
      </main>
    </>
  );
}

