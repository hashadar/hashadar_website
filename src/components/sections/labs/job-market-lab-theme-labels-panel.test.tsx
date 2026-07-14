import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { JobMarketLabThemeLabelsPanel } from '@/components/sections/labs/job-market-lab-theme-labels-panel';
import { SiteAuthProvider } from '@/hooks/use-site-auth';
import { jobMarketLab } from '@/data';
import { createMemorySiteAuth } from '@/lib/site-auth';

afterEach(() => {
  cleanup();
});

describe('JobMarketLabThemeLabelsPanel', () => {
  it('lets authenticated owners save theme label overrides from the published pulse', async () => {
    const user = userEvent.setup();
    const saved: Array<{ clusterKey: string; label: string }> = [];

    render(
      <SiteAuthProvider
        auth={createMemorySiteAuth({
          status: 'authenticated',
          email: 'owner@example.com',
        })}
      >
        <JobMarketLabThemeLabelsPanel
          publication={{
            fetchPublished: async () => ({
              documentCount: 2,
              publishedAt: '2026-07-14T12:00:00.000Z',
              skills: [],
              seniority: [],
              roleFamily: [],
              clusters: [{ id: 0, size: 2, label: 'python, sql' }],
              projection: [],
            }),
          }}
          themeLabels={{
            listOverrides: async () => [],
            saveOverride: async (record) => {
              saved.push(record);
            },
          }}
        />
      </SiteAuthProvider>,
    );

    expect(
      await screen.findByRole('heading', {
        name: jobMarketLab.console.themeLabelsHeading,
      }),
    ).toBeInTheDocument();

    const input = await screen.findByDisplayValue('python, sql');
    await user.clear(input);
    await user.type(input, 'Core data engineering demand');
    await user.click(
      screen.getByRole('button', { name: jobMarketLab.console.themeLabelSaveLabel }),
    );

    await waitFor(() => {
      expect(saved).toEqual([
        { clusterKey: '0', label: 'Core data engineering demand' },
      ]);
    });
    expect(
      screen.getByText(
        jobMarketLab.console.themeLabelSavedMessage.replace('{clusterKey}', '0'),
      ),
    ).toBeInTheDocument();
  });
});
