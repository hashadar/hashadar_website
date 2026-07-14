import { describe, expect, it, vi } from 'vitest';
import type { CareerProfile } from '@/data/types';
import {
  CANONICAL_CV_ID,
  getCanonicalCv,
  saveCanonicalCv,
  seedCanonicalCvFromProfile,
  type CanonicalCvDeps,
} from './canonical-cv';

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
        description: 'Third Year Individual Project: lap-time simulator.',
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

function createMemoryDeps(initial: { body: string; updatedAt: string } | null = null): CanonicalCvDeps & {
  store: { body: string; updatedAt: string } | null;
} {
  const store = { current: initial };
  return {
    store: store.current,
    async getCanonicalCv() {
      if (!store.current) {
        return null;
      }
      return {
        id: CANONICAL_CV_ID,
        body: store.current.body,
        updatedAt: store.current.updatedAt,
      };
    },
    async saveCanonicalCv(input) {
      store.current = { body: input.body, updatedAt: input.updatedAt };
      return {
        id: CANONICAL_CV_ID,
        body: input.body,
        updatedAt: input.updatedAt,
      };
    },
  };
}

describe('seedCanonicalCvFromProfile', () => {
  it('converts experience, education and certifications into markdown', () => {
    const body = seedCanonicalCvFromProfile(fixtureProfile);

    expect(body).toContain('## Experience');
    expect(body).toContain('### Deloitte LLP');
    expect(body).toContain('London, United Kingdom');
    expect(body).toContain('**Consultant** · Jun 2026 - Present');
    expect(body).toContain('Technology and Transformation | AI and Data.');
    expect(body).toContain('## Education');
    expect(body).toContain('### UCL — Mechanical Engineering (MEng)');
    expect(body).toContain('Sep 2019 - Jul 2023');
    expect(body).toContain('lap-time simulator');
    expect(body).toContain('## Certifications');
    expect(body).toContain(
      '**AWS Certified Cloud Practitioner** — Amazon Web Services · Issued Feb 2026',
    );
  });
});

describe('getCanonicalCv', () => {
  it('returns null when no CV is stored', async () => {
    const deps = createMemoryDeps(null);
    await expect(getCanonicalCv(deps)).resolves.toBeNull();
  });

  it('returns the stored CV record', async () => {
    const deps = createMemoryDeps({
      body: '# Owner CV',
      updatedAt: '2026-07-14T12:00:00.000Z',
    });

    await expect(getCanonicalCv(deps)).resolves.toEqual({
      id: CANONICAL_CV_ID,
      body: '# Owner CV',
      updatedAt: '2026-07-14T12:00:00.000Z',
    });
  });
});

describe('saveCanonicalCv', () => {
  it('persists body through injectable deps with a fresh updatedAt', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-14T15:30:00.000Z'));

    const deps = createMemoryDeps(null);
    const saved = await saveCanonicalCv('## Experience\n\nEdited copy.', deps);

    expect(saved).toEqual({
      id: CANONICAL_CV_ID,
      body: '## Experience\n\nEdited copy.',
      updatedAt: '2026-07-14T15:30:00.000Z',
    });
    await expect(getCanonicalCv(deps)).resolves.toEqual(saved);

    vi.useRealTimers();
  });
});
