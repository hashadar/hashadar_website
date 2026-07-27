import { describe, expect, it } from 'vitest';
import {
  ANON_EMPLOYER_NAME,
  createJobOs,
  createMemoryJobOsBodyStorage,
  createMemoryJobOsStore,
} from '@/lib/job-os';

function createTestJobOs(options?: { now?: string }) {
  const store = createMemoryJobOsStore();
  const bodies = createMemoryJobOsBodyStorage();
  const jobOs = createJobOs({
    store,
    bodies,
    now: () => options?.now ?? '2026-07-27T12:00:00.000Z',
    createId: (() => {
      let n = 0;
      return () => `id-${++n}`;
    })(),
  });
  return { jobOs, store, bodies };
}

describe('Job OS facade — Employers', () => {
  it('bootstraps the reserved Anon Employer once', async () => {
    const { jobOs, store } = createTestJobOs();

    const first = await jobOs.ensureAnonEmployer();
    const second = await jobOs.ensureAnonEmployer();

    expect(first.name).toBe(ANON_EMPLOYER_NAME);
    expect(first.isAnon).toBe(true);
    expect(second.id).toBe(first.id);
    expect(await store.listEmployers()).toHaveLength(1);
  });

  it('creates and lists Employers without a Body', async () => {
    const { jobOs } = createTestJobOs();

    const created = await jobOs.createEmployer({
      name: 'Acme Analytics',
      sizeTier: 'scaleup',
      prestigeTier: 'mid',
      summary: 'Data platform shop',
    });

    expect(created.status).toBe('created');
    if (created.status !== 'created') {
      return;
    }
    expect(created.employer.s3Key).toBeUndefined();
    expect(created.employer.isAnon).toBe(false);

    const listed = await jobOs.listEmployers();
    expect(listed.map((employer) => employer.name)).toContain('Acme Analytics');
  });

  it('updates Employer structured fields and attaches optional Body prose', async () => {
    const { jobOs } = createTestJobOs();
    const created = await jobOs.createEmployer({
      name: 'Beacon Labs',
      sizeTier: 'startup',
      prestigeTier: 'low',
    });
    expect(created.status).toBe('created');
    if (created.status !== 'created') {
      return;
    }

    const updated = await jobOs.updateEmployer({
      id: created.employer.id,
      name: 'Beacon Labs Ltd',
      sizeTier: 'startup',
      prestigeTier: 'mid',
      websiteUrl: 'https://beacon.example',
    });
    expect(updated.status).toBe('updated');
    if (updated.status !== 'updated') {
      return;
    }
    expect(updated.employer.name).toBe('Beacon Labs Ltd');
    expect(updated.employer.websiteUrl).toBe('https://beacon.example');

    const withBody = await jobOs.updateEmployerBody(
      created.employer.id,
      'Standing notes about the hiring team.',
    );
    expect(withBody.status).toBe('updated');
    if (withBody.status !== 'updated') {
      return;
    }
    expect(withBody.employer.s3Key).toMatch(/^bodies\/employers\//);
    expect(withBody.body).toBe('Standing notes about the hiring team.');

    const loaded = await jobOs.getEmployerBody(created.employer.id);
    expect(loaded.status).toBe('ok');
    if (loaded.status !== 'ok') {
      return;
    }
    expect(loaded.body).toBe('Standing notes about the hiring team.');
  });

  it('rejects creating an Employer with the reserved Anon name', async () => {
    const { jobOs } = createTestJobOs();
    const result = await jobOs.createEmployer({
      name: ANON_EMPLOYER_NAME,
      sizeTier: 'other',
      prestigeTier: 'low',
    });
    expect(result).toEqual({
      status: 'rejected',
      reason: 'Anon Employer is reserved; use ensureAnonEmployer',
    });
  });
});

describe('Job OS facade — Opportunities', () => {
  it('creates an Opportunity under Anon Employer without Body or Application', async () => {
    const { jobOs, store } = createTestJobOs();
    const anon = await jobOs.ensureAnonEmployer();

    const created = await jobOs.createOpportunity({
      employerId: anon.id,
      noticedAt: '2026-07-20T09:00:00.000Z',
      title: 'Staff Data Scientist',
      source: 'LinkedIn recruiter ping',
    });

    expect(created.status).toBe('created');
    if (created.status !== 'created') {
      return;
    }
    expect(created.opportunity.employerId).toBe(anon.id);
    expect(created.opportunity.status).toBe('open');
    expect(created.opportunity.s3Key).toBeUndefined();
    expect(await store.listApplications()).toHaveLength(0);
  });

  it('changes Opportunity status between open and closed', async () => {
    const { jobOs } = createTestJobOs();
    const employer = await jobOs.createEmployer({
      name: 'Northwind',
      sizeTier: 'enterprise',
      prestigeTier: 'high',
    });
    expect(employer.status).toBe('created');
    if (employer.status !== 'created') {
      return;
    }

    const created = await jobOs.createOpportunity({
      employerId: employer.employer.id,
      noticedAt: '2026-07-21T10:00:00.000Z',
      title: 'ML Engineer',
    });
    expect(created.status).toBe('created');
    if (created.status !== 'created') {
      return;
    }

    const closed = await jobOs.updateOpportunity({
      id: created.opportunity.id,
      employerId: employer.employer.id,
      noticedAt: created.opportunity.noticedAt,
      title: 'ML Engineer',
      status: 'closed',
    });
    expect(closed.status).toBe('updated');
    if (closed.status !== 'updated') {
      return;
    }
    expect(closed.opportunity.status).toBe('closed');

    const reopened = await jobOs.updateOpportunity({
      id: created.opportunity.id,
      employerId: employer.employer.id,
      noticedAt: created.opportunity.noticedAt,
      title: 'ML Engineer',
      status: 'open',
    });
    expect(reopened.status).toBe('updated');
    if (reopened.status !== 'updated') {
      return;
    }
    expect(reopened.opportunity.status).toBe('open');
  });
});

describe('Job OS facade — Pass and Decision Events', () => {
  it('records opportunity_passed without creating an Application or flipping status', async () => {
    const { jobOs, store } = createTestJobOs({
      now: '2026-07-27T15:30:00.000Z',
    });
    const anon = await jobOs.ensureAnonEmployer();
    const created = await jobOs.createOpportunity({
      employerId: anon.id,
      noticedAt: '2026-07-22T08:00:00.000Z',
      title: 'Platform Engineer',
    });
    expect(created.status).toBe('created');
    if (created.status !== 'created') {
      return;
    }

    const passed = await jobOs.passOpportunity(created.opportunity.id);
    expect(passed.status).toBe('passed');
    if (passed.status !== 'passed') {
      return;
    }

    expect(passed.opportunity.status).toBe('open');
    expect(passed.event.kind).toBe('opportunity_passed');
    expect(passed.event.occurredAt).toBe('2026-07-27T15:30:00.000Z');
    expect(await store.listApplications()).toHaveLength(0);

    const timeline = await jobOs.listDecisionEvents(created.opportunity.id);
    expect(timeline).toHaveLength(1);
    expect(timeline[0]?.kind).toBe('opportunity_passed');
  });
});

describe('Job OS facade — Applications', () => {
  it('pursues an Opportunity into a researching Application with application_started', async () => {
    const { jobOs } = createTestJobOs();
    const anon = await jobOs.ensureAnonEmployer();
    const created = await jobOs.createOpportunity({
      employerId: anon.id,
      noticedAt: '2026-07-23T11:00:00.000Z',
      title: 'Research Scientist',
    });
    expect(created.status).toBe('created');
    if (created.status !== 'created') {
      return;
    }

    const pursued = await jobOs.pursueOpportunity(created.opportunity.id);
    expect(pursued.status).toBe('pursued');
    if (pursued.status !== 'pursued') {
      return;
    }
    expect(pursued.application.status).toBe('researching');
    expect(pursued.event.kind).toBe('application_started');
    expect(pursued.event.toStatus).toBe('researching');
  });

  it('rejects a second Application on the same Opportunity', async () => {
    const { jobOs } = createTestJobOs();
    const anon = await jobOs.ensureAnonEmployer();
    const created = await jobOs.createOpportunity({
      employerId: anon.id,
      noticedAt: '2026-07-24T11:00:00.000Z',
      title: 'Analytics Lead',
    });
    expect(created.status).toBe('created');
    if (created.status !== 'created') {
      return;
    }

    await jobOs.pursueOpportunity(created.opportunity.id);
    const second = await jobOs.pursueOpportunity(created.opportunity.id);
    expect(second).toEqual({
      status: 'rejected',
      reason: 'Opportunity already has an Application',
    });
  });

  it('emits application_status_changed on legal transitions and rejects illegal ones', async () => {
    const { jobOs, store } = createTestJobOs();
    const anon = await jobOs.ensureAnonEmployer();
    const created = await jobOs.createOpportunity({
      employerId: anon.id,
      noticedAt: '2026-07-25T11:00:00.000Z',
      title: 'Principal Engineer',
    });
    expect(created.status).toBe('created');
    if (created.status !== 'created') {
      return;
    }

    const pursued = await jobOs.pursueOpportunity(created.opportunity.id);
    expect(pursued.status).toBe('pursued');
    if (pursued.status !== 'pursued') {
      return;
    }

    const applied = await jobOs.updateApplicationStatus(
      pursued.application.id,
      'applied',
    );
    expect(applied.status).toBe('updated');
    if (applied.status !== 'updated') {
      return;
    }
    expect(applied.event.kind).toBe('application_status_changed');
    expect(applied.event.fromStatus).toBe('researching');
    expect(applied.event.toStatus).toBe('applied');

    const illegal = await jobOs.updateApplicationStatus(
      pursued.application.id,
      'accepted',
    );
    expect(illegal.status).toBe('rejected');

    const withdrawn = await jobOs.updateApplicationStatus(
      pursued.application.id,
      'withdrawn',
    );
    expect(withdrawn.status).toBe('updated');
    if (withdrawn.status !== 'updated') {
      return;
    }

    const resurrect = await jobOs.updateApplicationStatus(
      pursued.application.id,
      'researching',
    );
    expect(resurrect.status).toBe('rejected');

    const note = await jobOs.updateTrackingNote(
      pursued.application.id,
      'Awaiting recruiter reply',
    );
    expect(note.status).toBe('updated');
    if (note.status !== 'updated') {
      return;
    }
    expect(note.application.trackingNote).toBe('Awaiting recruiter reply');

    const eventsBeforeBody = await store.listDecisionEventsForOpportunity(
      created.opportunity.id,
    );
    const eventCount = eventsBeforeBody.length;

    const withBody = await jobOs.updateApplicationBody(
      pursued.application.id,
      'Prep notes for the panel.',
    );
    expect(withBody.status).toBe('updated');

    const eventsAfter = await store.listDecisionEventsForOpportunity(
      created.opportunity.id,
    );
    expect(eventsAfter).toHaveLength(eventCount);
  });
});
