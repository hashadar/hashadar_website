import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { JobMarketLabEmployerAdmin } from '@/components/sections/labs/job-market-lab-employer-admin';
import { SiteAuthProvider } from '@/hooks/use-site-auth';
import { jobMarketLab } from '@/data';
import { createMemorySiteAuth } from '@/lib/site-auth';
import type { AmplifyEmployerDeps } from '@/lib/job-market-employers-amplify';
import type { EmployerRecord } from '@/lib/job-market-employers';

afterEach(() => {
  cleanup();
});

function createMemoryEmployerDeps(
  initial: EmployerRecord[] = [],
): AmplifyEmployerDeps & { store: Map<string, EmployerRecord> } {
  const store = new Map(initial.map((item) => [item.id, { ...item }]));
  let nextId = initial.length + 1;

  return {
    store,
    async listEmployers() {
      return [...store.values()];
    },
    async getEmployer(id) {
      return store.get(id) ?? null;
    },
    async insertEmployer(input) {
      const record = { id: `emp-${nextId++}`, ...input };
      store.set(record.id, record);
      return record;
    },
    async persistEmployer(record) {
      store.set(record.id, record);
    },
  };
}

function renderEmployerAdmin(
  auth = createMemorySiteAuth(),
  employers = createMemoryEmployerDeps(),
) {
  return render(
    <SiteAuthProvider auth={auth}>
      <JobMarketLabEmployerAdmin employers={employers} />
    </SiteAuthProvider>,
  );
}

const ownerAuth = () =>
  createMemorySiteAuth({ status: 'authenticated', email: 'owner@example.com' });

describe('JobMarketLabEmployerAdmin', () => {
  it('shows no employer registry controls to guests', async () => {
    renderEmployerAdmin(createMemorySiteAuth({ status: 'unauthenticated' }));

    expect(screen.queryByText(jobMarketLab.employerAdmin.heading)).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: jobMarketLab.employerAdmin.createButtonLabel }),
    ).not.toBeInTheDocument();
  });

  it('lets the signed-in owner create an employer with size and prestige tiers', async () => {
    const user = userEvent.setup();
    const employers = createMemoryEmployerDeps();
    renderEmployerAdmin(ownerAuth(), employers);

    expect(
      await screen.findByRole('heading', { name: jobMarketLab.employerAdmin.heading }),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText(`New ${jobMarketLab.employerAdmin.nameLabel}`), 'Globex Capital');
    await user.selectOptions(
      screen.getByLabelText(`New ${jobMarketLab.employerAdmin.sizeTierLabel}`),
      'scaleup',
    );
    await user.selectOptions(
      screen.getByLabelText(`New ${jobMarketLab.employerAdmin.prestigeTierLabel}`),
      'mid',
    );
    await user.click(
      screen.getByRole('button', { name: jobMarketLab.employerAdmin.createButtonLabel }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          jobMarketLab.employerAdmin.createdMessage.replace('{name}', 'Globex Capital'),
        ),
      ).toBeInTheDocument();
    });
    expect([...employers.store.values()]).toEqual([
      expect.objectContaining({
        name: 'Globex Capital',
        sizeTier: 'scaleup',
        prestigeTier: 'mid',
      }),
    ]);
  });

  it('lets the signed-in owner update an existing employer', async () => {
    const user = userEvent.setup();
    const employers = createMemoryEmployerDeps([
      {
        id: 'emp-1',
        name: 'Alpha Bank',
        sizeTier: 'enterprise',
        prestigeTier: 'high',
      },
    ]);
    renderEmployerAdmin(ownerAuth(), employers);

    const nameInput = await screen.findByLabelText(
      `${jobMarketLab.employerAdmin.nameLabel} (emp-1)`,
    );
    await user.clear(nameInput);
    await user.type(nameInput, 'Alpha Holdings');
    await user.selectOptions(
      screen.getByLabelText(`${jobMarketLab.employerAdmin.prestigeTierLabel} (emp-1)`),
      'elite',
    );
    await user.click(
      screen.getByRole('button', { name: jobMarketLab.employerAdmin.saveButtonLabel }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          jobMarketLab.employerAdmin.savedMessage.replace('{name}', 'Alpha Holdings'),
        ),
      ).toBeInTheDocument();
    });
    expect(employers.store.get('emp-1')).toEqual({
      id: 'emp-1',
      name: 'Alpha Holdings',
      sizeTier: 'enterprise',
      prestigeTier: 'elite',
    });
  });
});
