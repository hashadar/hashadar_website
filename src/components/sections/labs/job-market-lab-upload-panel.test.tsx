import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JobMarketLabUploadPanel } from '@/components/sections/labs/job-market-lab-upload-panel';
import { SiteAuthProvider } from '@/hooks/use-site-auth';
import { jobMarketLab } from '@/data';
import { createMemorySiteAuth } from '@/lib/site-auth';
import type { UploadJobDescriptionDeps } from '@/lib/job-market-lab';

afterEach(() => {
  cleanup();
});

const validMarkdown = `---
collectedAt: 2026-06-15T10:00:00.000Z
title: Senior Data Scientist
---

# Senior Data Scientist
`;

function renderUpload(options?: {
  auth?: ReturnType<typeof createMemorySiteAuth>;
  upload?: (input: { fileName: string; body: string }, deps?: UploadJobDescriptionDeps) => Promise<
    | { status: 'uploaded'; s3Key: string }
    | { status: 'rejected'; reason: string }
  >;
}) {
  const auth = options?.auth ?? createMemorySiteAuth();
  const upload =
    options?.upload ??
    vi.fn(async () => ({
      status: 'uploaded' as const,
      s3Key: 'raw/senior-data-scientist.md',
    }));

  return {
    upload,
    ...render(
      <SiteAuthProvider auth={auth}>
        <JobMarketLabUploadPanel uploadJobDescription={upload} />
      </SiteAuthProvider>,
    ),
  };
}

const ownerAuth = () =>
  createMemorySiteAuth({ status: 'authenticated', email: 'owner@example.com' });

describe('JobMarketLabUploadPanel', () => {
  it('shows no upload controls to guests', async () => {
    renderUpload({ auth: createMemorySiteAuth({ status: 'unauthenticated' }) });

    expect(screen.queryByText(jobMarketLab.upload.heading)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: jobMarketLab.upload.uploadButtonLabel }),
    ).not.toBeInTheDocument();
  });

  it('surfaces frontmatter validation errors before calling upload', async () => {
    const user = userEvent.setup();
    const upload = vi.fn(async () => ({
      status: 'uploaded' as const,
      s3Key: 'raw/should-not-run.md',
    }));
    renderUpload({ auth: ownerAuth(), upload });

    const file = new File(['# Role title\n\nBody copy.'], 'invalid.md', {
      type: 'text/markdown',
    });
    const input = await screen.findByLabelText(jobMarketLab.upload.fileLabel);
    await user.upload(input, file);
    await user.click(
      screen.getByRole('button', { name: jobMarketLab.upload.uploadButtonLabel }),
    );

    expect(
      await screen.findByText(jobMarketLab.upload.rejectedHeading),
    ).toBeInTheDocument();
    expect(screen.getByText('Missing YAML frontmatter')).toBeInTheDocument();
    expect(upload).not.toHaveBeenCalled();
  });

  it('uploads valid markdown through the facade and shows the storage key', async () => {
    const user = userEvent.setup();
    const upload = vi.fn(async () => ({
      status: 'uploaded' as const,
      s3Key: 'raw/senior-data-scientist.md',
    }));
    renderUpload({ auth: ownerAuth(), upload });

    const file = new File([validMarkdown], 'senior-data-scientist.md', {
      type: 'text/markdown',
    });
    const input = await screen.findByLabelText(jobMarketLab.upload.fileLabel);
    await user.upload(input, file);
    await user.click(
      screen.getByRole('button', { name: jobMarketLab.upload.uploadButtonLabel }),
    );

    await waitFor(() => {
      expect(upload).toHaveBeenCalledOnce();
    });
    expect(upload).toHaveBeenCalledWith({
      fileName: 'senior-data-scientist.md',
      body: validMarkdown,
    });
    expect(
      screen.getByText(
        jobMarketLab.upload.uploadedMessage.replace(
          '{s3Key}',
          'raw/senior-data-scientist.md',
        ),
      ),
    ).toBeInTheDocument();
  });
});
