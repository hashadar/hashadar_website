import { footer, site } from "@/data";

export function StructuredData() {
  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: site.metadata.author,
    url: site.metadata.siteUrl,
    sameAs: [footer.contact.social.linkedin, footer.contact.social.github],
    jobTitle: site.person.jobTitle,
    worksFor: {
      "@type": "Organization",
      name: site.person.worksFor,
    },
    alumniOf: {
      "@type": "EducationalOrganization",
      name: site.person.alumniOf,
    },
    knowsAbout: site.person.knowsAbout,
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
    dateCreated: site.person.profileDateCreated,
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

