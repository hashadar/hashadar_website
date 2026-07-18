import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JobMarketLabHitlQueuePanel } from '@/components/sections/labs/job-market-lab-hitl-queue-panel';
import { SiteAuthProvider } from '@/hooks/use-site-auth';
import { jobMarketLab } from '@/data';
import { createMemorySiteAuth } from '@/lib/site-auth';
import type { EmployerRecord } from '@/lib/job-market-employers';
import type { ScrapeCandidateRecord } from '@/lib/scrape-candidates';

afterEach(() => {
  cleanup();
});

const validBody = `---
collectedAt: 2026-06-15T10:00:00.000Z
title: Quant analyst
source: example-board
---

# Quant analyst

Lead modelling work.
`;

function pendingCandidate(
  overrides: Partial<ScrapeCandidateRecord> & Pick<ScrapeCandidateRecord, 'id'>,
): ScrapeCandidateRecord {
  return {
    fileName: 'quant-analyst.md',
    body: validBody,
    status: 'pending',
    title: 'Quant analyst',
    source: 'example-board',
    collectedAt: '2026-06-15T10:00:00.000Z',
    ...overrides,
  };
}

function createMemoryDeps(initial: ScrapeCandidateRecord[]) {
  const store = new Map(initial.map((item) => [item.id, { ...item }]));
  return {
    listScrapeCandidates: async () =>
      [...store.values()].filter((item) => item.status === 'pending'),
    getScrapeCandidate: async (id: string) => store.get(id) ?? null,
    saveScrapeCandidate: async (record: ScrapeCandidateRecord) => {
      store.set(record.id, record);
    },
  };
}

const sampleEmployers: EmployerRecord[] = [
  {
    id: 'emp-1',
    name: 'Example Bank',
    sizeTier: 'enterprise',
    prestigeTier: 'high',
  },
  {
    id: 'emp-2',
    name: 'Janus Henderson',
    sizeTier: 'enterprise',
    prestigeTier: 'high',
  },
];

function renderPanel(options?: {
  candidates?: ScrapeCandidateRecord[];
  acceptScrapeCandidateFn?: ReturnType<typeof vi.fn>;
  rejectScrapeCandidateFn?: ReturnType<typeof vi.fn>;
  parseJobListingFromUrlFn?: ReturnType<typeof vi.fn>;
  listEmployersFn?: ReturnType<typeof vi.fn>;
  scrapeCandidates?: ReturnType<typeof createMemoryDeps>;
}) {
  const deps = options?.scrapeCandidates ?? createMemoryDeps(options?.candidates ?? []);
  return render(
    <SiteAuthProvider auth={createMemorySiteAuth({ status: 'authenticated', email: 'owner@example.com' })}>
      <JobMarketLabHitlQueuePanel
        scrapeCandidates={deps}
        listEmployersFn={
          options?.listEmployersFn ?? vi.fn(async () => sampleEmployers)
        }
        acceptScrapeCandidateFn={
          options?.acceptScrapeCandidateFn ??
          vi.fn(async () => ({
            status: 'accepted' as const,
            s3Key: 'raw/quant-analyst.md',
            candidate: pendingCandidate({ id: 'c-1', status: 'accepted' }),
          }))
        }
        rejectScrapeCandidateFn={
          options?.rejectScrapeCandidateFn ??
          vi.fn(async () => ({
            status: 'rejected' as const,
            candidate: pendingCandidate({ id: 'c-1', status: 'rejected' }),
          }))
        }
        parseJobListingFromUrlFn={
          options?.parseJobListingFromUrlFn ??
          vi.fn(async () => ({
            status: 'enqueued' as const,
            candidateId: 'c-new',
            previewTitle: 'Parsed role',
            previewExcerpt: 'Preview body',
          }))
        }
      />
    </SiteAuthProvider>,
  );
}

describe('JobMarketLabHitlQueuePanel', () => {
  it('shows parse controls, employer select, and review for pending candidates', async () => {
    renderPanel({
      candidates: [pendingCandidate({ id: 'c-1' })],
    });

    expect(
      await screen.findByRole('heading', { name: jobMarketLab.hitlQueue.heading }),
    ).toBeInTheDocument();
    expect(await screen.findByDisplayValue('Quant analyst')).toBeInTheDocument();
    expect(
      await screen.findByLabelText(`${jobMarketLab.hitlQueue.employerLabel} (c-1)`),
    ).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Janus Henderson' })).toBeInTheDocument();
  });

  it('saves employer and other adjustments then submits to the corpus', async () => {
    const candidates = [pendingCandidate({ id: 'c-1', employerId: undefined })];
    const deps = createMemoryDeps(candidates);
    const saveSpy = vi.spyOn(deps, 'saveScrapeCandidate');
    const acceptScrapeCandidateFn = vi.fn(async () => ({
      status: 'accepted' as const,
      s3Key: 'raw/quant-analyst.md',
      candidate: pendingCandidate({ id: 'c-1', status: 'accepted' }),
    }));

    renderPanel({
      scrapeCandidates: deps,
      acceptScrapeCandidateFn,
    });

    fireEvent.change(
      await screen.findByLabelText(`${jobMarketLab.hitlQueue.employerLabel} (c-1)`),
      { target: { value: 'emp-2' } },
    );
    fireEvent.change(
      screen.getByLabelText(`${jobMarketLab.hitlQueue.sourceLabel} (c-1)`),
      { target: { value: 'careers' } },
    );
    fireEvent.click(
      screen.getByRole('button', { name: jobMarketLab.hitlQueue.acceptLabel }),
    );

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalled();
      expect(acceptScrapeCandidateFn).toHaveBeenCalledWith('c-1');
    });
    const saved = saveSpy.mock.calls[0]?.[0] as ScrapeCandidateRecord;
    expect(saved.employerId).toBe('emp-2');
    expect(saved.body).toContain('employerId: emp-2');
    expect(saved.source).toBe('careers');
  });

  it('opens paste fallback after an unfetchable URL parse', async () => {
    const parseJobListingFromUrlFn = vi.fn(async () => ({
      status: 'unfetchable' as const,
      reason: 'The listing page returned an error status. (HTTP 403)',
    }));

    renderPanel({ parseJobListingFromUrlFn });

    fireEvent.change(
      await screen.findByLabelText(jobMarketLab.hitlQueue.parseListing.urlLabel),
      { target: { value: 'https://careers.mckinsey.com/jobs/1' } },
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: jobMarketLab.hitlQueue.parseListing.submitLabel,
      }),
    );

    expect(
      await screen.findByText(jobMarketLab.hitlQueue.parseListing.unfetchableHeading),
    ).toBeInTheDocument();
    expect(
      await screen.findByLabelText(jobMarketLab.hitlQueue.parseListing.pasteLabel),
    ).toBeInTheDocument();
  });

  it('parses pasted page content when URL fetch is skipped', async () => {
    const deps = createMemoryDeps([]);
    const parseJobListingFromUrlFn = vi.fn(async (input) => {
      expect(input).toEqual({
        url: 'https://careers.revolut.com/jobs/1',
        pageText: 'Senior engineer role. '.repeat(20),
      });
      await deps.saveScrapeCandidate(
        pendingCandidate({
          id: 'c-pasted',
          title: 'Senior engineer',
        }),
      );
      return {
        status: 'enqueued' as const,
        candidateId: 'c-pasted',
        previewTitle: 'Senior engineer',
      };
    });

    renderPanel({ scrapeCandidates: deps, parseJobListingFromUrlFn });

    fireEvent.change(
      await screen.findByLabelText(jobMarketLab.hitlQueue.parseListing.urlLabel),
      { target: { value: 'https://careers.revolut.com/jobs/1' } },
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: jobMarketLab.hitlQueue.parseListing.showPasteLabel,
      }),
    );
    fireEvent.change(
      await screen.findByLabelText(jobMarketLab.hitlQueue.parseListing.pasteLabel),
      { target: { value: 'Senior engineer role. '.repeat(20) } },
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: jobMarketLab.hitlQueue.parseListing.pasteSubmitLabel,
      }),
    );

    await waitFor(() => {
      expect(parseJobListingFromUrlFn).toHaveBeenCalled();
    });
    expect(await screen.findByDisplayValue('Senior engineer')).toBeInTheDocument();
  });

  it('discards a candidate without promoting to raw/', async () => {
    const rejectScrapeCandidateFn = vi.fn(async () => ({
      status: 'rejected' as const,
      candidate: pendingCandidate({ id: 'c-1', status: 'rejected' }),
    }));

    renderPanel({
      candidates: [pendingCandidate({ id: 'c-1' })],
      rejectScrapeCandidateFn,
    });

    fireEvent.click(
      await screen.findByRole('button', { name: jobMarketLab.hitlQueue.rejectLabel }),
    );

    await waitFor(() => {
      expect(rejectScrapeCandidateFn).toHaveBeenCalledWith('c-1');
    });
  });
});
