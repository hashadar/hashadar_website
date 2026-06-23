import { describe, expect, it } from 'vitest';
import { careerProfile } from '@/data';
import type { CareerProfile } from '@/data/types';
import { getAboutCertificationsView } from './certifications-slices';

const fixtureProfile: CareerProfile = {
  experience: {
    companies: [],
  },
  education: {
    entries: [],
  },
  certifications: {
    items: [
      {
        name: 'AWS Certified Cloud Practitioner',
        issuer: 'Amazon Web Services',
        issued: 'Issued Feb 2026',
      },
    ],
  },
};

describe('getAboutCertificationsView', () => {
  it('returns a CertificationsSection with the About page heading and profile certification items', () => {
    const view = getAboutCertificationsView(fixtureProfile);

    expect(view.heading).toBe('certifications');
    expect(view.items).toEqual(fixtureProfile.certifications.items);
  });
});

describe('career profile certifications slice', () => {
  it('derives the About certifications view from canonical profile items', () => {
    const view = getAboutCertificationsView(careerProfile);

    expect(view.heading).toBe('certifications');
    expect(view.items).toEqual(careerProfile.certifications.items);
    expect(view.items.length).toBeGreaterThan(0);
  });
});
