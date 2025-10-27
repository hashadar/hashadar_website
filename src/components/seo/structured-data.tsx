import { site } from "@/data";

export function StructuredData() {
  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: site.metadata.author,
    url: site.metadata.siteUrl,
    sameAs: [
      // Social profiles will be added from footer data
      "https://linkedin.com/in/hdar",
      "https://github.com/hashadar",
    ],
    jobTitle: "AI & Data Consultant",
    worksFor: {
      "@type": "Organization",
      name: "Deloitte LLP",
    },
    alumniOf: {
      "@type": "EducationalOrganization",
      name: "University College London",
    },
    knowsAbout: [
      "Artificial Intelligence",
      "Data Management",
      "Data Consulting",
      "Photography",
      "Software Development",
    ],
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.brandName,
    url: site.metadata.siteUrl,
    description: site.metadata.description,
    author: {
      "@type": "Person",
      name: site.metadata.author,
    },
    inLanguage: "en-GB",
  };

  const profilePageSchema = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: site.metadata.author,
      description: site.metadata.description,
    },
    dateCreated: "2025-01-01",
    dateModified: new Date().toISOString(),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(profilePageSchema) }}
      />
    </>
  );
}

