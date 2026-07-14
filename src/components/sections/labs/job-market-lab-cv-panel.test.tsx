import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JobMarketLabCvPanel } from '@/components/sections/labs/job-market-lab-cv-panel';
import { SiteAuthProvider } from '@/hooks/use-site-auth';
import { careerProfile, jobMarketLab } from '@/data';
import { createMemorySiteAuth } from '@/lib/site-auth';
import type { CanonicalCvDeps } from '@/lib/canonical-cv';
import { seedCanonicalCvFromProfile } from '@/lib/canonical-cv';

afterEach(() => {
  cleanup();
});

function createMemoryCanonicalCv(initial: string | null = null): CanonicalCvDeps & {
  getStoredBody: () => string | null;
} {
  let body = initial;
  return {
    getStoredBody: () => body,
    async getCanonicalCv() {
      if (body === null) {
        return null;
      }
      return {
        id: 'current',
        body,
        updatedAt: '2026-07-14T12:00:00.000Z',
      };
    },
    async saveCanonicalCv(input) {
      body = input.body;
      return {
        id: 'current',
        body: input.body,
        updatedAt: input.updatedAt,
      };
    },
  };
}

function renderCvPanel(options?: {
  auth?: ReturnType<typeof createMemorySiteAuth>;
  canonicalCv?: CanonicalCvDeps;
}) {
  const auth = options?.auth ?? createMemorySiteAuth();
  return render(
    <SiteAuthProvider auth={auth}>
      <JobMarketLabCvPanel canonicalCv={options?.canonicalCv} />
    </SiteAuthProvider>,
  );
}

const ownerAuth = () =>
  createMemorySiteAuth({ status: 'authenticated', email: 'owner@example.com' });

describe('JobMarketLabCvPanel', () => {
  it('shows no CV controls to guests', async () => {
    renderCvPanel({ auth: createMemorySiteAuth({ status: 'unauthenticated' }) });

    expect(
      screen.queryByRole('heading', { name: jobMarketLab.console.cv.heading }),
    ).not.toBeInTheDocument();
  });

  it('offers seed from profile when no canonical CV exists', async () => {
    const user = userEvent.setup();
    const deps = createMemoryCanonicalCv(null);
    renderCvPanel({ auth: ownerAuth(), canonicalCv: deps });

    expect(
      await screen.findByText(jobMarketLab.console.cv.emptyHint),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: jobMarketLab.console.cv.seedButtonLabel }),
    );

    expect(
      await screen.findByText(jobMarketLab.console.cv.seededMessage),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(jobMarketLab.console.cv.bodyLabel)).toHaveValue(
      seedCanonicalCvFromProfile(careerProfile),
    );
  });

  it('loads, edits and saves the canonical CV through injectable deps', async () => {
    const user = userEvent.setup();
    const deps = createMemoryCanonicalCv('## Experience\n\nInitial body.');
    renderCvPanel({ auth: ownerAuth(), canonicalCv: deps });

    const textarea = await screen.findByLabelText(jobMarketLab.console.cv.bodyLabel);
    await waitFor(() => {
      expect(textarea).toHaveValue('## Experience\n\nInitial body.');
    });

    await user.clear(textarea);
    await user.type(textarea, '## Experience\n\nEdited body.');
    await user.click(
      screen.getByRole('button', { name: jobMarketLab.console.cv.saveButtonLabel }),
    );

    await waitFor(() => {
      expect(deps.getStoredBody()).toBe('## Experience\n\nEdited body.');
    });
    expect(
      screen.getByText(jobMarketLab.console.cv.savedMessage),
    ).toBeInTheDocument();
  });
});
