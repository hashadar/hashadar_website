import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { JobOsApplicationsWorkspace } from '@/components/sections/labs/job-os/job-os-applications-workspace';
import { jobOs } from '@/data';
import {
  createJobOs,
  createMemoryJobOsBodyStorage,
  createMemoryJobOsStore,
  type JobOs,
} from '@/lib/job-os';

afterEach(() => {
  cleanup();
});

const ORIGINAL_BODY = 'Original prep notes.';
const UPDATED_BODY = 'Updated prep notes.';
const copy = jobOs.applications;

function createClient(): JobOs {
  return createJobOs({
    store: createMemoryJobOsStore(),
    bodies: createMemoryJobOsBodyStorage(),
    now: () => '2026-08-13T10:00:00.000Z',
    createId: (() => {
      let n = 0;
      return () => `app-${++n}`;
    })(),
  });
}

async function seedApplication(client: JobOs, body = ORIGINAL_BODY) {
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

  const pursued = await client.pursueOpportunity(created.opportunity.id);
  expect(pursued.status).toBe('pursued');
  if (pursued.status !== 'pursued') {
    throw new Error('expected application');
  }

  if (body) {
    const written = await client.updateApplicationBody(
      pursued.application.id,
      body,
    );
    expect(written.status).toBe('updated');
  }

  return pursued.application.id;
}

function bodyField() {
  return screen.getByRole('textbox', {
    name: (name) => name.startsWith(copy.bodyLabel),
  });
}

function noteField() {
  return screen.getByRole('textbox', {
    name: (name) => name.startsWith(copy.trackingNoteLabel),
  });
}

function withStaleApplicationBody(inner: JobOs): JobOs {
  return new Proxy(inner, {
    get(target, prop, receiver) {
      if (prop === 'getApplicationBody') {
        return async (id: string) => {
          const result = await target.getApplicationBody(id);
          if (result.status !== 'ok') {
            return result;
          }
          return { ...result, body: ORIGINAL_BODY };
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

async function editBodyAndSave(updated = UPDATED_BODY) {
  const user = userEvent.setup();
  const textarea = await screen.findByRole('textbox', {
    name: (name) => name.startsWith(copy.bodyLabel),
  });
  await user.clear(textarea);
  await user.click(textarea);
  await user.paste(updated);
  await user.click(screen.getByRole('button', { name: copy.saveBodyLabel }));
  expect(await screen.findByText(copy.bodySavedLabel)).toBeInTheDocument();
  return user;
}

describe('JobOsApplicationsWorkspace', () => {
  it('persists an edited Application Body so a later open shows the new text', async () => {
    const client = createClient();
    const applicationId = await seedApplication(client);

    const { unmount } = render(
      <JobOsApplicationsWorkspace
        jobOsClient={client}
        selectedId={applicationId}
      />,
    );

    expect(
      await screen.findByRole('heading', { name: 'Staff data scientist' }),
    ).toBeInTheDocument();
    expect(bodyField()).toHaveValue(ORIGINAL_BODY);
    await editBodyAndSave();
    expect(bodyField()).toHaveValue(UPDATED_BODY);
    unmount();

    render(
      <JobOsApplicationsWorkspace
        jobOsClient={client}
        selectedId={applicationId}
      />,
    );

    expect(
      await screen.findByRole('textbox', {
        name: (name) => name.startsWith(copy.bodyLabel),
      }),
    ).toHaveValue(UPDATED_BODY);
    expect(screen.queryByDisplayValue(ORIGINAL_BODY)).not.toBeInTheDocument();
    cleanup();

    render(<JobOsApplicationsWorkspace jobOsClient={client} />);
    expect(await screen.findByText(copy.hasBodyLabel)).toBeInTheDocument();
  });

  it('does not revert a saved Body when the list refresh reads stale prose', async () => {
    const inner = createClient();
    const applicationId = await seedApplication(inner);
    const client = withStaleApplicationBody(inner);

    render(
      <JobOsApplicationsWorkspace
        jobOsClient={client}
        selectedId={applicationId}
      />,
    );

    expect(
      await screen.findByRole('heading', { name: 'Staff data scientist' }),
    ).toBeInTheDocument();
    expect(bodyField()).toHaveValue(ORIGINAL_BODY);
    await editBodyAndSave();

    expect(bodyField()).toHaveValue(UPDATED_BODY);
    expect(screen.queryByDisplayValue(ORIGINAL_BODY)).not.toBeInTheDocument();

    const stored = await inner.getApplicationBody(applicationId);
    expect(stored.status).toBe('ok');
    if (stored.status !== 'ok') {
      return;
    }
    expect(stored.body).toBe(UPDATED_BODY);
    expect(stored.application.s3Key).toBe(
      `bodies/applications/${applicationId}.md`,
    );
  });

  it('keeps the saved Body when status and the tracking note are updated', async () => {
    const inner = createClient();
    const applicationId = await seedApplication(inner);
    const client = withStaleApplicationBody(inner);

    const { unmount } = render(
      <JobOsApplicationsWorkspace
        jobOsClient={client}
        selectedId={applicationId}
      />,
    );

    expect(
      await screen.findByRole('heading', { name: 'Staff data scientist' }),
    ).toBeInTheDocument();
    const user = await editBodyAndSave();
    expect(bodyField()).toHaveValue(UPDATED_BODY);

    await user.selectOptions(
      screen.getByRole('combobox', { name: copy.statusLabel }),
      'applied',
    );
    await user.click(screen.getByRole('button', { name: copy.saveStatusLabel }));
    expect(await screen.findByText(copy.statusUpdatedLabel)).toBeInTheDocument();
    expect(bodyField()).toHaveValue(UPDATED_BODY);

    const note = 'Recruiter asked for a portfolio.';
    await user.click(noteField());
    await user.paste(note);
    await user.click(screen.getByRole('button', { name: copy.saveNoteLabel }));
    expect(await screen.findByText(copy.noteSavedLabel)).toBeInTheDocument();
    expect(bodyField()).toHaveValue(UPDATED_BODY);
    expect(screen.queryByDisplayValue(ORIGINAL_BODY)).not.toBeInTheDocument();
    unmount();

    const stored = await inner.getApplicationBody(applicationId);
    expect(stored.status).toBe('ok');
    if (stored.status !== 'ok') {
      return;
    }
    expect(stored.body).toBe(UPDATED_BODY);
    expect(stored.application.status).toBe('applied');
    expect(stored.application.trackingNote).toBe(note);

    render(
      <JobOsApplicationsWorkspace
        jobOsClient={inner}
        selectedId={applicationId}
      />,
    );

    expect(
      await screen.findByRole('textbox', {
        name: (name) => name.startsWith(copy.bodyLabel),
      }),
    ).toHaveValue(UPDATED_BODY);
    expect(screen.getByRole('combobox', { name: copy.statusLabel })).toHaveValue(
      'applied',
    );
    expect(noteField()).toHaveValue(note);
  });

  it('shows a storage failure and leaves Save Body available', async () => {
    const store = createMemoryJobOsStore();
    const bodies = createMemoryJobOsBodyStorage();
    let failPuts = false;
    const client = createJobOs({
      store,
      bodies: {
        ...bodies,
        putBody: async (input) => {
          if (failPuts) {
            throw new Error('storage unavailable');
          }
          return bodies.putBody(input);
        },
      },
      now: () => '2026-08-13T10:00:00.000Z',
      createId: (() => {
        let n = 0;
        return () => `app-${++n}`;
      })(),
    });
    const applicationId = await seedApplication(client);
    failPuts = true;

    render(
      <JobOsApplicationsWorkspace
        jobOsClient={client}
        selectedId={applicationId}
      />,
    );

    const user = userEvent.setup();
    expect(
      await screen.findByRole('heading', { name: 'Staff data scientist' }),
    ).toBeInTheDocument();
    const draft = `${ORIGINAL_BODY} Extra.`;
    const textarea = bodyField();
    await user.clear(textarea);
    await user.click(textarea);
    await user.paste(draft);
    await user.click(screen.getByRole('button', { name: copy.saveBodyLabel }));

    expect(
      await screen.findByText('Could not save Application Body'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: copy.saveBodyLabel }),
    ).toBeEnabled();
    expect(
      screen.queryByRole('button', { name: copy.savingBodyLabel }),
    ).not.toBeInTheDocument();
    expect(bodyField()).toHaveValue(draft);
  });
});
