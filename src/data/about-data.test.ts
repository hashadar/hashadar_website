import { describe, expect, it } from 'vitest';
import * as dataExports from '@/data';
import {
  about,
  careerProfile,
  getAboutCareerViews,
  getPageData,
} from '@/data';
import type { CareerProfile } from '@/data/types';

describe('data layer cv retirement', () => {
  it('does not export a cv module for career structured content', () => {
    expect('cv' in dataExports).toBe(false);
    expect(dataExports).toHaveProperty('careerProfile');
    expect(dataExports).toHaveProperty('getAboutCareerViews');
  });
});

describe('getPageData for About', () => {
  it('returns page shell content only, without embedded career sections', () => {
    const pageData = getPageData('/about');

    expect(pageData).toEqual(about);
    expect(pageData).toMatchObject({
      hero: expect.objectContaining({ name: expect.any(String), title: expect.any(String) }),
      professional: expect.objectContaining({ heading: expect.any(String), content: expect.anything() }),
    });
    expect(pageData).not.toHaveProperty('experience');
    expect(pageData).not.toHaveProperty('education');
    expect(pageData).not.toHaveProperty('certifications');
  });
});

describe('getAboutCareerViews', () => {
  const fixtureProfile: CareerProfile = {
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
    education: {
      entries: [
        {
          institution: 'UCL',
          qualification: 'Mechanical Engineering (MEng)',
          period: 'Sep 2019 - Jul 2023',
          description: 'Third Year Individual Project.',
        },
      ],
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

  it('composes About career sections explicitly from profile slices', () => {
    const views = getAboutCareerViews(fixtureProfile);

    expect(views.experience).toEqual({
      heading: 'experience',
      companies: fixtureProfile.experience.companies,
    });
    expect(views.education).toEqual({
      heading: 'education',
      entries: fixtureProfile.education.entries,
    });
    expect(views.certifications).toEqual({
      heading: 'certifications',
      items: fixtureProfile.certifications.items,
    });
  });

  it('derives live About career views from the canonical career profile', () => {
    const views = getAboutCareerViews(careerProfile);

    expect(views.experience.companies).toEqual(careerProfile.experience.companies);
    expect(views.education.entries).toEqual(careerProfile.education.entries);
    expect(views.certifications.items).toEqual(careerProfile.certifications.items);
  });
});

describe('career profile data access', () => {
  it('exposes canonical career content separate from the About page shell', () => {
    expect(careerProfile.experience.companies.length).toBeGreaterThan(0);
    expect(careerProfile.education.entries.length).toBeGreaterThan(0);
    expect(careerProfile.certifications.items.length).toBeGreaterThan(0);
    expect(about).not.toHaveProperty('experience');
    expect(about).not.toHaveProperty('education');
    expect(about).not.toHaveProperty('certifications');
  });
});
