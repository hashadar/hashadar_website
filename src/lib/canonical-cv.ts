import type { CareerProfile } from '@/data/types';
import { getAboutCareerViews } from '@/data/profile/about-career-slices';

export const CANONICAL_CV_ID = 'current' as const;

export type CanonicalCvRecord = {
  id: typeof CANONICAL_CV_ID;
  body: string;
  updatedAt: string;
};

export type CanonicalCvDeps = {
  getCanonicalCv: () => Promise<CanonicalCvRecord | null>;
  saveCanonicalCv: (input: {
    body: string;
    updatedAt: string;
  }) => Promise<CanonicalCvRecord>;
};

export async function getCanonicalCv(
  deps: Pick<CanonicalCvDeps, 'getCanonicalCv'>,
): Promise<CanonicalCvRecord | null> {
  return deps.getCanonicalCv();
}

export async function saveCanonicalCv(
  body: string,
  deps: CanonicalCvDeps,
): Promise<CanonicalCvRecord> {
  const updatedAt = new Date().toISOString();
  return deps.saveCanonicalCv({ body, updatedAt });
}

export function seedCanonicalCvFromProfile(profile: CareerProfile): string {
  const views = getAboutCareerViews(profile);
  const sections: string[] = [];

  const experienceLines: string[] = ['## Experience', ''];
  for (const company of views.experience.companies) {
    experienceLines.push(`### ${company.name}`);
    experienceLines.push(company.location);
    experienceLines.push('');
    for (const role of company.roles) {
      experienceLines.push(`**${role.role}** · ${role.period}`);
      experienceLines.push('');
      experienceLines.push(role.description);
      experienceLines.push('');
    }
  }
  sections.push(experienceLines.join('\n').trimEnd());

  const educationLines: string[] = ['## Education', ''];
  for (const entry of views.education.entries) {
    educationLines.push(`### ${entry.institution} — ${entry.qualification}`);
    educationLines.push(entry.period);
    educationLines.push('');
    educationLines.push(entry.description);
    educationLines.push('');
  }
  sections.push(educationLines.join('\n').trimEnd());

  const certificationLines: string[] = ['## Certifications', ''];
  for (const item of views.certifications.items) {
    certificationLines.push(
      `- **${item.name}** — ${item.issuer} · ${item.issued}`,
    );
  }
  sections.push(certificationLines.join('\n').trimEnd());

  return sections.join('\n\n');
}
