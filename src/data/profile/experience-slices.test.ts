import { describe, expect, it } from 'vitest';
import { careerProfile } from '@/data';
import type { CareerProfile } from '@/data/types';
import { getAboutExperienceView, getHomeExperienceView } from './experience-slices';

const fixtureProfile: CareerProfile = {
  certifications: {
    items: [],
  },
  education: {
    entries: [],
  },
  experience: {
    companies: [
      {
        name: 'Deloitte LLP',
        location: 'London, United Kingdom',
        roles: [
          {
            role: 'Consultant',
            period: 'Jun 2026 - Present',
            description: 'Technology and Transformation | AI and Data.',
          },
        ],
      },
    ],
  },
};

describe('getHomeExperienceView', () => {
  it('returns an ExperienceSection with the Home page heading and profile companies', () => {
    const view = getHomeExperienceView(fixtureProfile);

    expect(view.heading).toBe('Experience');
    expect(view.companies).toEqual(fixtureProfile.experience.companies);
  });
});

describe('getAboutExperienceView', () => {
  it('returns an ExperienceSection with the About page heading and profile companies', () => {
    const view = getAboutExperienceView(fixtureProfile);

    expect(view.heading).toBe('experience');
    expect(view.companies).toEqual(fixtureProfile.experience.companies);
  });
});

describe('career profile experience slices', () => {
  it('derive Home and About views from the same canonical companies', () => {
    const homeView = getHomeExperienceView(careerProfile);
    const aboutView = getAboutExperienceView(careerProfile);

    expect(homeView.companies).toEqual(careerProfile.experience.companies);
    expect(aboutView.companies).toEqual(careerProfile.experience.companies);
    expect(homeView.companies).toEqual(aboutView.companies);
  });
});
