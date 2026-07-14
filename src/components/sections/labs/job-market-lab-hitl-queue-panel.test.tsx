import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JobMarketLabHitlQueuePanel } from '@/components/sections/labs/job-market-lab-hitl-queue-panel';
import { SiteAuthProvider } from '@/hooks/use-site-auth';
import { jobMarketLab } from '@/data';
import { createMemorySiteAuth } from '@/lib/site-auth';
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
    listScrapeCandidates: async () => [...store.values()],
    getScrapeCandidate: async (id: string) => store.get(id) ?? null,
    saveScrapeCandidate: async (record: ScrapeCandidateRecord) => {
      store.set(record.id, record);
    },
  };
}

function renderPanel(options?: {
  candidates?: ScrapeCandidateRecord[];
  acceptScrapeCandidateFn?: ReturnType<typeof vi.fn>;
  rejectScrapeCandidateFn?: ReturnType<typeof vi.fn>;
}) {
  const deps = createMemoryDeps(options?.candidates ?? []);
  return render(
    <SiteAuthProvider auth={createMemorySiteAuth({ status: 'authenticated' })}>
      <JobMarketLabHitlQueuePanel
        scrapeCandidates={deps}
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
      />
    </SiteAuthProvider>,
  );
}

describe('JobMarketLabHitlQueuePanel', () => {
  it('lists pending scrape candidates for authenticated owners', async () => {
    renderPanel({
      candidates: [pendingCandidate({ id: 'c-1' })],
    });

    expect(
      await screen.findByRole('heading', { name: jobMarketLab.hitlQueue.heading }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Quant analyst')).toBeInTheDocument();
    expect(screen.getByText('example-board')).toBeInTheDocument();
  });

  it('accepts a candidate through the injected facade without LLM assist by default', async () => {
    const acceptScrapeCandidateFn = vi.fn(async () => ({
      status: 'accepted' as const,
      s3Key: 'raw/quant-analyst.md',
      candidate: pendingCandidate({ id: 'c-1', status: 'accepted' }),
    }));

    renderPanel({
      candidates: [pendingCandidate({ id: 'c-1' })],
      acceptScrapeCandidateFn,
    });

    fireEvent.click(
      await screen.findByRole('button', { name: jobMarketLab.hitlQueue.acceptLabel }),
    );

    await waitFor(() => {
      expect(acceptScrapeCandidateFn).toHaveBeenCalledWith('c-1', { llmAssist: false });
    });
    expect(
      screen.getByText(
        jobMarketLab.hitlQueue.acceptedMessage.replace('{s3Key}', 'raw/quant-analyst.md'),
      ),
    ).toBeInTheDocument();
  });

  it('passes llmAssist true when the owner opts into LLM assist', async () => {
    const acceptScrapeCandidateFn = vi.fn(async () => ({
      status: 'accepted' as const,
      s3Key: 'raw/quant-analyst.md',
      candidate: pendingCandidate({ id: 'c-1', status: 'accepted' }),
    }));

    renderPanel({
      candidates: [pendingCandidate({ id: 'c-1' })],
      acceptScrapeCandidateFn,
    });

    fireEvent.click(
      await screen.findByRole('checkbox', { name: jobMarketLab.hitlQueue.llmAssistLabel }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: jobMarketLab.hitlQueue.acceptLabel }),
    );

    await waitFor(() => {
      expect(acceptScrapeCandidateFn).toHaveBeenCalledWith('c-1', { llmAssist: true });
    });
  });

  it('rejects a candidate without promoting to raw/', async () => {
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
    expect(screen.getByText(jobMarketLab.hitlQueue.rejectedMessage)).toBeInTheDocument();
  });
});
