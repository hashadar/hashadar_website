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
  it('returns biography copy only, without embedded career sections', () => {
    const pageData = getPageData('/about');

    expect(pageData).toEqual(about);
    expect(pageData).toMatchObject({
      heading: expect.any(String),
      lede: expect.any(Array),
    });
    expect(pageData).not.toHaveProperty('hero');
    expect(pageData).not.toHaveProperty('professional');
    expect(pageData).not.toHaveProperty('experience');
    expect(pageData).not.toHaveProperty('education');
    expect(pageData).not.toHaveProperty('certifications');
  });

  it('keeps the biography free of a Labs door', () => {
    expect(about.lede.join(' ').toLowerCase()).not.toContain('labs');
    expect(about).not.toHaveProperty('cta');
    expect(JSON.stringify(about)).not.toMatch(/explore labs/i);
  });

  it('does not pitch the blog from the lede', () => {
    expect(about.lede.join(' ').toLowerCase()).not.toContain('blog');
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
            {
              role: 'Analyst',
              period: 'Sep 2024 - May 2025',
              description: 'Technology and Transformation | AI and Data.',
            },
          ],
        },
        {
          name: 'ALTEN Ltd',
          location: 'London, United Kingdom',
          roles: [
            {
              role: 'Graduate Business Manager',
              period: 'Jan 2024 - Jul 2024',
              description: 'Business Development.',
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

  it('promotes the current seat and flattens earlier facts', () => {
    const views = getAboutCareerViews(fixtureProfile);

    expect(views.current).toEqual({
      name: 'Deloitte LLP',
      location: 'London, United Kingdom',
      period: 'since Sep 2024',
      titles: [
        { role: 'Consultant', period: 'since Jun 2026', current: true },
        { role: 'Analyst', period: 'Sep 2024 - May 2025', current: false },
      ],
    });
    expect(views.earlier).toEqual([
      {
        name: 'ALTEN Ltd',
        detail: 'Graduate Business Manager',
        period: 'Jan 2024 - Jul 2024',
      },
      {
        name: 'UCL',
        detail: 'Mechanical Engineering (MEng)',
        period: 'Sep 2019 - Jul 2023',
      },
    ]);
    expect(views.certifications).toEqual([{ name: 'AWS Certified Cloud Practitioner' }]);
  });

  it('derives the live About career view from the canonical career profile', () => {
    const views = getAboutCareerViews(careerProfile);

    expect(views.current).toEqual({
      name: 'Deloitte LLP',
      location: 'London, United Kingdom',
      department: 'Technology & Transformation, AI & Data',
      period: 'since Sep 2024',
      titles: [
        { role: 'Consultant', period: 'since Jun 2026', current: true },
        { role: 'Senior Analyst', period: 'Jun 2025 - May 2026', current: false },
        { role: 'Analyst', period: 'Sep 2024 - May 2025', current: false },
      ],
    });
    expect(views.earlier.map((fact) => fact.name)).toEqual(['ALTEN Ltd', 'UCL']);
    expect(views.certifications.map((item) => item.name)).toEqual([
      'Bloomberg Finance Fundamentals',
      'AWS Certified Cloud Practitioner',
      'Databricks Certified Data Analyst Associate',
    ]);
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
