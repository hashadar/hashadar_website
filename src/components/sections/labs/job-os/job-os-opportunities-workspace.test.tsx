import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { JobOsOpportunitiesWorkspace } from '@/components/sections/labs/job-os/job-os-opportunities-workspace';
import { jobOs } from '@/data';
import {
  createJobOs,
  createMemoryJobOsBodyStorage,
  createMemoryJobOsStore,
  type JobOs,
} from '@/lib/job-os';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

afterEach(() => {
  cleanup();
});

const ORIGINAL_BODY = 'Original listing prose.';
const UPDATED_BODY = 'Updated listing prose.';

function createClient(): JobOs {
  return createJobOs({
    store: createMemoryJobOsStore(),
    bodies: createMemoryJobOsBodyStorage(),
    now: () => '2026-08-13T10:00:00.000Z',
    createId: (() => {
      let n = 0;
      return () => `opp-${++n}`;
    })(),
  });
}

async function seedOpportunity(client: JobOs, body = ORIGINAL_BODY) {
  const employer = await client.createEmployer({
    name: 'Acme Analytics',
    sizeTier: 'scaleup',
    prestigeTier: 'mid',
    sector: 'technology',
  });
  expect(employer.status).toBe('created');
  if (employer.status !== 'created') {
    throw new Error('expected employer');
  }

  const created = await client.createOpportunity({
    employerId: employer.employer.id,
    noticedAt: '2026-07-20T09:00:00.000Z',
    title: 'Staff data scientist',
  });
  expect(created.status).toBe('created');
  if (created.status !== 'created') {
    throw new Error('expected opportunity');
  }

  const written = await client.updateOpportunityBody(
    created.opportunity.id,
    body,
  );
  expect(written.status).toBe('updated');

  return created.opportunity.id;
}

async function editBodyAndSave(updated = UPDATED_BODY) {
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole('button', {
      name: jobOs.opportunities.editBodyLabel,
    }),
  );
  const textarea = screen.getByPlaceholderText(jobOs.opportunities.noBodyLabel);
  await user.clear(textarea);
  await user.click(textarea);
  await user.paste(updated);
  await user.click(
    screen.getByRole('button', { name: jobOs.opportunities.saveLabel }),
  );
  expect(
    await screen.findByText(jobOs.opportunities.savedLabel),
  ).toBeInTheDocument();
}

describe('JobOsOpportunitiesWorkspace', () => {
  it('persists an edited Opportunity Body so a reload shows the new text', async () => {
    const client = createClient();
    const opportunityId = await seedOpportunity(client);

    const { unmount } = render(
      <JobOsOpportunitiesWorkspace
        jobOsClient={client}
        selectedId={opportunityId}
      />,
    );

    expect(await screen.findByText(ORIGINAL_BODY)).toBeInTheDocument();
    await editBodyAndSave();
    unmount();

    render(
      <JobOsOpportunitiesWorkspace
        jobOsClient={client}
        selectedId={opportunityId}
      />,
    );

    expect(await screen.findByText(UPDATED_BODY)).toBeInTheDocument();
    expect(screen.queryByText(ORIGINAL_BODY)).not.toBeInTheDocument();
  });

  it('does not revert a saved Body when the ledger refresh reads stale prose', async () => {
    const inner = createClient();
    const opportunityId = await seedOpportunity(inner);
    const client = new Proxy(inner, {
      get(target, prop, receiver) {
        if (prop === 'getOpportunityBody') {
          return async (id: string) => {
            const result = await target.getOpportunityBody(id);
            if (result.status !== 'ok') {
              return result;
            }
            return { ...result, body: ORIGINAL_BODY };
          };
        }
        return Reflect.get(target, prop, receiver);
      },
    });

    render(
      <JobOsOpportunitiesWorkspace
        jobOsClient={client}
        selectedId={opportunityId}
      />,
    );

    expect(
      await screen.findByRole('heading', { name: 'Staff data scientist' }),
    ).toBeInTheDocument();
    expect(await screen.findByText(ORIGINAL_BODY)).toBeInTheDocument();
    await editBodyAndSave();

    expect(screen.getByText(UPDATED_BODY)).toBeInTheDocument();
    expect(screen.queryByText(ORIGINAL_BODY)).not.toBeInTheDocument();

    const stored = await inner.getOpportunityBody(opportunityId);
    expect(stored.status).toBe('ok');
    if (stored.status !== 'ok') {
      return;
    }
    expect(stored.body).toBe(UPDATED_BODY);
  });

  it('places Save opportunity in the same action cluster as Pass and Pursue', async () => {
    const client = createClient();
    const opportunityId = await seedOpportunity(client);

    render(
      <JobOsOpportunitiesWorkspace
        jobOsClient={client}
        selectedId={opportunityId}
      />,
    );

    const pass = await screen.findByRole('button', {
      name: jobOs.opportunities.passLabel,
    });
    const pursue = screen.getByRole('button', {
      name: jobOs.opportunities.pursueLabel,
    });
    const save = screen.getByRole('button', {
      name: jobOs.opportunities.saveLabel,
    });

    expect(save.parentElement).toBe(pass.parentElement);
    expect(pursue.parentElement).toBe(pass.parentElement);
  });
});
