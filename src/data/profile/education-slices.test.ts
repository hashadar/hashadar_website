import { describe, expect, it } from 'vitest';
import { careerProfile } from '@/data';
import type { CareerProfile } from '@/data/types';
import { getAboutEducationView } from './education-slices';

const fixtureProfile: CareerProfile = {
  experience: {
    companies: [],
  },
  certifications: {
    items: [],
  },
  education: {
    entries: [
      {
        institution: 'UCL',
        qualification: 'Mechanical Engineering (MEng)',
        period: 'Sep 2019 - Jul 2023',
        description:
          'Third Year Individual Project: Designing a lap-time simulator for the Shell Eco-marathon.',
      },
    ],
  },
};

describe('getAboutEducationView', () => {
  it('returns an EducationSection with the About page heading and profile education entries', () => {
    const view = getAboutEducationView(fixtureProfile);

    expect(view.heading).toBe('education');
    expect(view.entries).toEqual(fixtureProfile.education.entries);
  });
});

describe('career profile education slice', () => {
  it('derives the About education view from canonical profile entries', () => {
    const view = getAboutEducationView(careerProfile);

    expect(view.heading).toBe('education');
    expect(view.entries).toEqual(careerProfile.education.entries);
    expect(view.entries.length).toBeGreaterThan(0);
  });
});
