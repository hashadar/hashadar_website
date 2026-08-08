import { describe, expect, it } from 'vitest';
import {
  ANON_EMPLOYER_NAME,
  bodyEntityS3Key,
  createJobOs,
  createMemoryJobOsBodyStorage,
  createMemoryJobOsStore,
  HUNT_PROFILE_SINGLETON_ID,
} from '@/lib/job-os';
import { createFakeFitAnalyser } from '@/lib/job-os-fit-analyser';

function createTestJobOs(options?: {
  now?: string;
  fitAnalyser?: ReturnType<typeof createFakeFitAnalyser>;
}) {
  const store = createMemoryJobOsStore();
  const bodies = createMemoryJobOsBodyStorage();
  const jobOs = createJobOs({
    store,
    bodies,
    fitAnalyser: options?.fitAnalyser,
    now: () => options?.now ?? '2026-07-27T12:00:00.000Z',
    createId: (() => {
      let n = 0;
      return () => `id-${++n}`;
    })(),
  });
  return { jobOs, store, bodies };
}

describe('Job OS Body S3 keys', () => {
  it('uses plural path segments that match storage access rules', () => {
    expect(bodyEntityS3Key('employer', 'e1')).toBe('bodies/employers/e1.md');
    expect(bodyEntityS3Key('opportunity', 'o1')).toBe(
      'bodies/opportunities/o1.md',
    );
    expect(bodyEntityS3Key('application', 'a1')).toBe(
      'bodies/applications/a1.md',
    );
    expect(bodyEntityS3Key('huntProfile', 'hunt-profile')).toBe(
      'bodies/hunt-profiles/hunt-profile.md',
    );
  });
});

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
      sector: 'technology',
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
      sector: 'technology',
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
      sector: 'technology',
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
      sector: 'other',
    });
    expect(result).toEqual({
      status: 'rejected',
      reason: 'Anon Employer is reserved; use ensureAnonEmployer',
    });
  });

  it('rejects Employer Body update when body storage fails', async () => {
    const store = createMemoryJobOsStore();
    const bodies = createMemoryJobOsBodyStorage();
    const jobOs = createJobOs({
      store,
      bodies: {
        ...bodies,
        putBody: async () => {
          throw new Error('storage unavailable');
        },
      },
      now: () => '2026-07-27T12:00:00.000Z',
      createId: (() => {
        let n = 0;
        return () => `id-${++n}`;
      })(),
    });
    const created = await jobOs.createEmployer({
      name: 'Acme Analytics',
      sizeTier: 'scaleup',
      prestigeTier: 'mid',
      sector: 'technology',
    });
    expect(created.status).toBe('created');
    if (created.status !== 'created') {
      return;
    }

    const result = await jobOs.updateEmployerBody(
      created.employer.id,
      'Standing notes about the hiring team.',
    );

    expect(result).toEqual({
      status: 'rejected',
      reason: 'Could not save Employer Body',
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
      sector: 'law',
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
      title: 'ML Engineer',
      status: 'open',
    });
    expect(reopened.status).toBe('updated');
    if (reopened.status !== 'updated') {
      return;
    }
    expect(reopened.opportunity.status).toBe('open');
  });

  it('preserves noticedAt when an Opportunity is updated', async () => {
    const { jobOs } = createTestJobOs();
    const employer = await jobOs.createEmployer({
      name: 'Northwind',
      sizeTier: 'enterprise',
      prestigeTier: 'high',
      sector: 'law',
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

    const updated = await jobOs.updateOpportunity({
      id: created.opportunity.id,
      employerId: employer.employer.id,
      title: 'Staff ML Engineer',
      status: 'open',
    });
    expect(updated.status).toBe('updated');
    if (updated.status !== 'updated') {
      return;
    }
    expect(updated.opportunity.noticedAt).toBe('2026-07-21T10:00:00.000Z');
    expect(updated.opportunity.title).toBe('Staff ML Engineer');
  });

  it('rejects Opportunity Body update when body storage fails', async () => {
    const store = createMemoryJobOsStore();
    const bodies = createMemoryJobOsBodyStorage();
    const jobOs = createJobOs({
      store,
      bodies: {
        ...bodies,
        putBody: async () => {
          throw new Error('storage unavailable');
        },
      },
      now: () => '2026-07-27T12:00:00.000Z',
      createId: (() => {
        let n = 0;
        return () => `id-${++n}`;
      })(),
    });
    const anon = await jobOs.ensureAnonEmployer();
    const created = await jobOs.createOpportunity({
      employerId: anon.id,
      noticedAt: '2026-07-20T09:00:00.000Z',
      title: 'Staff Data Scientist',
    });
    expect(created.status).toBe('created');
    if (created.status !== 'created') {
      return;
    }

    const result = await jobOs.updateOpportunityBody(
      created.opportunity.id,
      'Pasted listing prose.',
    );

    expect(result).toEqual({
      status: 'rejected',
      reason: 'Could not save Opportunity Body',
    });
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

  it('rejects a second Pass on the same Opportunity', async () => {
    const { jobOs } = createTestJobOs();
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

    const first = await jobOs.passOpportunity(created.opportunity.id);
    expect(first.status).toBe('passed');

    const second = await jobOs.passOpportunity(created.opportunity.id);
    expect(second).toEqual({
      status: 'rejected',
      reason: 'Opportunity already passed',
    });
  });

  it('rejects Pass when an Application already exists', async () => {
    const { jobOs } = createTestJobOs();
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

    const pursued = await jobOs.pursueOpportunity(created.opportunity.id);
    expect(pursued.status).toBe('pursued');

    const passed = await jobOs.passOpportunity(created.opportunity.id);
    expect(passed).toEqual({
      status: 'rejected',
      reason: 'Opportunity already has an Application',
    });
  });

  it('rejects Pass when Decision Event persistence fails', async () => {
    const store = createMemoryJobOsStore();
    const bodies = createMemoryJobOsBodyStorage();
    const jobOs = createJobOs({
      store: {
        ...store,
        appendDecisionEvent: async () => {
          throw new Error('AppSync unavailable');
        },
      },
      bodies,
      now: () => '2026-07-27T15:30:00.000Z',
      createId: (() => {
        let n = 0;
        return () => `id-${++n}`;
      })(),
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

    const result = await jobOs.passOpportunity(created.opportunity.id);

    expect(result).toEqual({
      status: 'rejected',
      reason: 'Could not record Pass decision',
    });
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

  it('allows skipping from researching to interviewing', async () => {
    const { jobOs } = createTestJobOs();
    const anon = await jobOs.ensureAnonEmployer();
    const created = await jobOs.createOpportunity({
      employerId: anon.id,
      noticedAt: '2026-07-25T12:00:00.000Z',
      title: 'Staff Engineer',
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

    const interviewing = await jobOs.updateApplicationStatus(
      pursued.application.id,
      'interviewing',
    );
    expect(interviewing.status).toBe('updated');
    if (interviewing.status !== 'updated') {
      return;
    }
    expect(interviewing.application.status).toBe('interviewing');
    expect(interviewing.event.fromStatus).toBe('researching');
    expect(interviewing.event.toStatus).toBe('interviewing');
  });

  it('rejects Pursue when Application persistence fails', async () => {
    const store = createMemoryJobOsStore();
    const bodies = createMemoryJobOsBodyStorage();
    const jobOs = createJobOs({
      store: {
        ...store,
        insertApplication: async () => {
          throw new Error('AppSync unavailable');
        },
      },
      bodies,
      now: () => '2026-07-27T12:00:00.000Z',
      createId: (() => {
        let n = 0;
        return () => `id-${++n}`;
      })(),
    });
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

    const result = await jobOs.pursueOpportunity(created.opportunity.id);

    expect(result).toEqual({
      status: 'rejected',
      reason: 'Could not start Application',
    });
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

  it('allows free movement between Application statuses', async () => {
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

    const interviewing = await jobOs.updateApplicationStatus(
      pursued.application.id,
      'interviewing',
    );
    expect(interviewing.status).toBe('updated');
    if (interviewing.status !== 'updated') {
      return;
    }
    expect(interviewing.event.kind).toBe('application_status_changed');
    expect(interviewing.event.fromStatus).toBe('researching');
    expect(interviewing.event.toStatus).toBe('interviewing');

    const accepted = await jobOs.updateApplicationStatus(
      pursued.application.id,
      'accepted',
    );
    expect(accepted.status).toBe('updated');
    if (accepted.status !== 'updated') {
      return;
    }

    const resurrect = await jobOs.updateApplicationStatus(
      pursued.application.id,
      'researching',
    );
    expect(resurrect.status).toBe('updated');
    if (resurrect.status !== 'updated') {
      return;
    }
    expect(resurrect.application.status).toBe('researching');

    const same = await jobOs.updateApplicationStatus(
      pursued.application.id,
      'researching',
    );
    expect(same.status).toBe('rejected');

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

  it('closes the Opportunity when Application moves to a terminal status', async () => {
    const { jobOs } = createTestJobOs();
    const anon = await jobOs.ensureAnonEmployer();

    async function pursueOpenOpportunity(title: string) {
      const created = await jobOs.createOpportunity({
        employerId: anon.id,
        noticedAt: '2026-07-25T11:00:00.000Z',
        title,
      });
      expect(created.status).toBe('created');
      if (created.status !== 'created') {
        throw new Error('expected created');
      }
      expect(created.opportunity.status).toBe('open');

      const pursued = await jobOs.pursueOpportunity(created.opportunity.id);
      expect(pursued.status).toBe('pursued');
      if (pursued.status !== 'pursued') {
        throw new Error('expected pursued');
      }
      return {
        opportunityId: created.opportunity.id,
        applicationId: pursued.application.id,
      };
    }

    for (const terminal of ['withdrawn', 'rejected', 'accepted'] as const) {
      const { opportunityId, applicationId } = await pursueOpenOpportunity(
        `Role ${terminal}`,
      );
      await jobOs.updateApplicationStatus(applicationId, 'interviewing');
      const updated = await jobOs.updateApplicationStatus(
        applicationId,
        terminal,
      );
      expect(updated.status).toBe('updated');

      const opportunity = await jobOs.getOpportunity(opportunityId);
      expect(opportunity.status).toBe('ok');
      if (opportunity.status !== 'ok') {
        return;
      }
      expect(opportunity.opportunity.status).toBe('closed');
    }
  });

  it('does not reopen a closed Opportunity when Application leaves a terminal status', async () => {
    const { jobOs } = createTestJobOs();
    const anon = await jobOs.ensureAnonEmployer();
    const created = await jobOs.createOpportunity({
      employerId: anon.id,
      noticedAt: '2026-07-25T11:00:00.000Z',
      title: 'Reopened pursuit candidate',
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

    await jobOs.updateApplicationStatus(pursued.application.id, 'withdrawn');
    await jobOs.updateApplicationStatus(pursued.application.id, 'researching');

    const opportunity = await jobOs.getOpportunity(created.opportunity.id);
    expect(opportunity.status).toBe('ok');
    if (opportunity.status !== 'ok') {
      return;
    }
    expect(opportunity.opportunity.status).toBe('closed');
  });

  it('leaves Opportunity open for non-terminal Application status changes', async () => {
    const { jobOs } = createTestJobOs();
    const anon = await jobOs.ensureAnonEmployer();
    const created = await jobOs.createOpportunity({
      employerId: anon.id,
      noticedAt: '2026-07-25T11:00:00.000Z',
      title: 'Still in play',
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

    await jobOs.updateApplicationStatus(pursued.application.id, 'applied');
    await jobOs.updateApplicationStatus(pursued.application.id, 'interviewing');
    await jobOs.updateApplicationStatus(pursued.application.id, 'offer');

    const opportunity = await jobOs.getOpportunity(created.opportunity.id);
    expect(opportunity.status).toBe('ok');
    if (opportunity.status !== 'ok') {
      return;
    }
    expect(opportunity.opportunity.status).toBe('open');
  });
});

describe('Job OS facade — Vocabulary', () => {
  it('seeds default Vocabulary terms idempotently', async () => {
    const { jobOs } = createTestJobOs();

    const first = await jobOs.ensureVocabularyDefaults();
    const second = await jobOs.ensureVocabularyDefaults();

    expect(first.length).toBeGreaterThan(0);
    expect(second).toHaveLength(first.length);
    expect(first.map((term) => `${term.kind}:${term.value}`).sort()).toEqual(
      second.map((term) => `${term.kind}:${term.value}`).sort(),
    );
    expect(first.some((term) => term.kind === 'sector' && term.value === 'law')).toBe(
      true,
    );
  });

  it('rejects Employer create with an unknown sector', async () => {
    const { jobOs } = createTestJobOs();
    await jobOs.ensureVocabularyDefaults();

    const result = await jobOs.createEmployer({
      name: 'Mystery Co',
      sizeTier: 'startup',
      prestigeTier: 'mid',
      sector: 'not_a_real_sector',
    });

    expect(result).toEqual({
      status: 'rejected',
      reason: 'Unrecognised employer sector',
    });
  });

  it('creates a Vocabulary term and uses it on an Employer', async () => {
    const { jobOs } = createTestJobOs();
    await jobOs.ensureVocabularyDefaults();

    const createdTerm = await jobOs.createVocabularyTerm({
      kind: 'sector',
      value: 'Aerospace Defence',
      label: 'Aerospace & defence',
    });
    expect(createdTerm.status).toBe('created');
    if (createdTerm.status !== 'created') {
      return;
    }
    expect(createdTerm.term.value).toBe('aerospace_defence');

    const employer = await jobOs.createEmployer({
      name: 'Orbit Systems',
      sizeTier: 'scaleup',
      prestigeTier: 'high',
      sector: 'aerospace_defence',
    });
    expect(employer.status).toBe('created');
    if (employer.status !== 'created') {
      return;
    }
    expect(employer.employer.sector).toBe('aerospace_defence');
  });

  it('rejects new writes with a deactivated Vocabulary term', async () => {
    const { jobOs } = createTestJobOs();
    await jobOs.ensureVocabularyDefaults();

    const created = await jobOs.createEmployer({
      name: 'Media House',
      sizeTier: 'enterprise',
      prestigeTier: 'mid',
      sector: 'media',
    });
    expect(created.status).toBe('created');
    if (created.status !== 'created') {
      return;
    }

    const media = (await jobOs.listVocabularyTerms('sector')).find(
      (term) => term.value === 'media',
    );
    expect(media).toBeDefined();
    if (!media) {
      return;
    }

    const deactivated = await jobOs.updateVocabularyTerm({
      id: media.id,
      active: false,
    });
    expect(deactivated.status).toBe('updated');

    const loaded = await jobOs.getEmployer(created.employer.id);
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(loaded.employer.sector).toBe('media');
    }

    const rejected = await jobOs.createEmployer({
      name: 'Another Media Co',
      sizeTier: 'startup',
      prestigeTier: 'low',
      sector: 'media',
    });
    expect(rejected).toEqual({
      status: 'rejected',
      reason: 'Unrecognised employer sector',
    });
  });

  it('rejects Opportunity seniority that is not an active Vocabulary term', async () => {
    const { jobOs } = createTestJobOs();
    const anon = await jobOs.ensureAnonEmployer();

    const result = await jobOs.createOpportunity({
      employerId: anon.id,
      noticedAt: '2026-07-28T09:00:00.000Z',
      title: 'Mystery Role',
      seniority: 'staff_plus',
    });

    expect(result).toEqual({
      status: 'rejected',
      reason: 'Unrecognised seniority value',
    });
  });
});

describe('Job OS facade — Hunt Profile', () => {
  it('creates the singleton once and updates in place', async () => {
    const { jobOs, store } = createTestJobOs();

    const created = await jobOs.upsertHuntProfile({
      targetSeniority: 'senior',
      targetRoleFamily: 'engineering',
      locationFlexibility: 'Hybrid London',
      compensationFloor: 95000,
      compensationCurrency: 'GBP',
      compensationPeriod: 'year',
      mustHaveTags: ['TypeScript'],
      dealBreakerTags: ['On-call nights'],
      escapePains: ['Politics'],
      seekDesires: ['Ownership'],
    });
    expect(created.status).toBe('created');
    if (created.status !== 'created') {
      return;
    }
    expect(created.profile.id).toBe(HUNT_PROFILE_SINGLETON_ID);

    const updated = await jobOs.upsertHuntProfile({
      targetSeniority: 'lead',
      targetRoleFamily: 'engineering',
      compensationFloor: 110000,
      compensationCurrency: 'GBP',
      compensationPeriod: 'year',
      mustHaveTags: ['TypeScript', 'AWS'],
    });
    expect(updated.status).toBe('updated');
    if (updated.status !== 'updated') {
      return;
    }
    expect(updated.profile.targetSeniority).toBe('lead');
    expect(await store.getHuntProfile()).toEqual(updated.profile);

    const listed = await jobOs.getHuntProfile();
    expect(listed.profile?.id).toBe(HUNT_PROFILE_SINGLETON_ID);
  });

  it('stores Hunt Profile Body separately from Site careerProfile', async () => {
    const { jobOs, bodies } = createTestJobOs();
    await jobOs.upsertHuntProfile({
      targetSeniority: 'senior',
      seekDesires: ['Craft'],
    });

    const withBody = await jobOs.updateHuntProfileBody(
      'Narrative CV and projects — not Site careerProfile.',
    );
    expect(withBody.status).toBe('updated');
    if (withBody.status !== 'updated') {
      return;
    }
    expect(withBody.profile.s3Key).toBe(
      'bodies/hunt-profiles/hunt-profile.md',
    );
    expect(await bodies.getBody(withBody.profile.s3Key!)).toContain(
      'not Site careerProfile',
    );

    const read = await jobOs.getHuntProfileBody();
    expect(read.body).toContain('not Site careerProfile');
  });
});

describe('Job OS facade — Structural checklist', () => {
  it('exposes core five rows through the facade without Decision Events', async () => {
    const { jobOs, store } = createTestJobOs();
    const anon = await jobOs.ensureAnonEmployer();
    await jobOs.upsertHuntProfile({
      targetSeniority: 'senior',
      targetRoleFamily: 'engineering',
      compensationFloor: 100000,
      compensationCurrency: 'GBP',
      compensationPeriod: 'year',
      mustHaveTags: ['typescript'],
      dealBreakerTags: ['php'],
    });
    const created = await jobOs.createOpportunity({
      employerId: anon.id,
      noticedAt: '2026-07-28T09:00:00.000Z',
      title: 'Platform engineer',
      seniority: 'senior',
      roleFamily: 'engineering',
      compensationDisclosure: 'range',
      compensationCurrency: 'GBP',
      compensationPeriod: 'year',
      compensationMin: 90000,
      compensationMax: 120000,
      technologies: ['typescript', 'aws'],
    });
    expect(created.status).toBe('created');
    if (created.status !== 'created') {
      return;
    }

    const result = await jobOs.getStructuralChecklist(created.opportunity.id);
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') {
      return;
    }
    expect(result.checklist.rows).toHaveLength(5);
    expect(
      result.checklist.rows.every((row) =>
        ['pass', 'fail', 'unknown'].includes(row.verdict),
      ),
    ).toBe(true);
    expect(
      await store.listDecisionEventsForOpportunity(created.opportunity.id),
    ).toHaveLength(0);
  });
});

describe('Job OS facade — Fit Insight', () => {
  it('rejects analyse when Hunt Profile is unusable', async () => {
    const { jobOs } = createTestJobOs({
      fitAnalyser: createFakeFitAnalyser(),
    });
    const anon = await jobOs.ensureAnonEmployer();
    const created = await jobOs.createOpportunity({
      employerId: anon.id,
      noticedAt: '2026-07-28T09:00:00.000Z',
      title: 'Role',
    });
    expect(created.status).toBe('created');
    if (created.status !== 'created') {
      return;
    }

    const result = await jobOs.analyseOpportunityFit(created.opportunity.id);
    expect(result).toEqual({
      status: 'rejected',
      reason: 'A usable Hunt Profile is required before analysing fit',
    });
  });

  it('persists latest-wins Fit Insight via fake analyser without Decision Events', async () => {
    let clock = '2026-08-01T10:00:00.000Z';
    const store = createMemoryJobOsStore();
    const bodies = createMemoryJobOsBodyStorage();
    const jobOs = createJobOs({
      store,
      bodies,
      fitAnalyser: createFakeFitAnalyser({
        summary: 'Strong platform fit',
        advantages: ['Stack match'],
        disadvantages: ['Comp uncertainty'],
        fitNotes: ['Hybrid aligns'],
        gaps: ['No ML ownership signal'],
      }),
      now: () => clock,
      createId: (() => {
        let n = 0;
        return () => `fit-${++n}`;
      })(),
    });

    const anon = await jobOs.ensureAnonEmployer();
    await jobOs.upsertHuntProfile({
      targetSeniority: 'senior',
      seekDesires: ['Ownership'],
    });
    const created = await jobOs.createOpportunity({
      employerId: anon.id,
      noticedAt: '2026-07-28T09:00:00.000Z',
      title: 'Platform engineer',
      seniority: 'senior',
    });
    expect(created.status).toBe('created');
    if (created.status !== 'created') {
      return;
    }

    const analysed = await jobOs.analyseOpportunityFit(created.opportunity.id);
    expect(analysed.status).toBe('ok');
    if (analysed.status !== 'ok') {
      return;
    }
    expect(analysed.insight.summary).toBe('Strong platform fit');
    expect(analysed.insight.stale).toBe(false);
    expect(
      await store.listDecisionEventsForOpportunity(created.opportunity.id),
    ).toHaveLength(0);

    clock = '2026-08-01T11:00:00.000Z';
    await jobOs.updateOpportunity({
      id: created.opportunity.id,
      employerId: anon.id,
      title: 'Staff platform engineer',
      seniority: 'senior',
    });

    const staleView = await jobOs.getFitInsight(created.opportunity.id);
    expect(staleView.status).toBe('ok');
    if (staleView.status !== 'ok' || !staleView.insight) {
      return;
    }
    expect(staleView.insight.stale).toBe(true);

    clock = '2026-08-01T12:00:00.000Z';
    const rerun = await jobOs.analyseOpportunityFit(created.opportunity.id);
    expect(rerun.status).toBe('ok');
    if (rerun.status !== 'ok') {
      return;
    }
    expect(rerun.insight.stale).toBe(false);
    const persisted = await store.getFitInsightByOpportunityId(
      created.opportunity.id,
    );
    expect(persisted?.id).toBe(analysed.insight.id);
    expect(persisted?.analysedAt).toBe('2026-08-01T12:00:00.000Z');
  });
});

describe('Job OS facade — Overview attention', () => {
  async function seedPursuit(
    jobOs: ReturnType<typeof createJobOs>,
    options: {
      employerName: string;
      title: string;
      noticedAt: string;
      status?: 'researching' | 'applied' | 'interviewing' | 'offer';
      trackingNote?: string;
    },
  ) {
    const employer = await jobOs.createEmployer({
      name: options.employerName,
      sizeTier: 'scaleup',
      prestigeTier: 'mid',
      sector: 'technology',
    });
    expect(employer.status).toBe('created');
    if (employer.status !== 'created') {
      throw new Error('expected employer');
    }

    const opportunity = await jobOs.createOpportunity({
      employerId: employer.employer.id,
      noticedAt: options.noticedAt,
      title: options.title,
    });
    expect(opportunity.status).toBe('created');
    if (opportunity.status !== 'created') {
      throw new Error('expected opportunity');
    }

    const pursued = await jobOs.pursueOpportunity(opportunity.opportunity.id);
    expect(pursued.status).toBe('pursued');
    if (pursued.status !== 'pursued') {
      throw new Error('expected pursuit');
    }

    if (options.status && options.status !== 'researching') {
      const updated = await jobOs.updateApplicationStatus(
        pursued.application.id,
        options.status,
      );
      expect(updated.status).toBe('updated');
    }

    if (options.trackingNote) {
      const note = await jobOs.updateTrackingNote(
        pursued.application.id,
        options.trackingNote,
      );
      expect(note.status).toBe('updated');
    }

    return pursued.application.id;
  }

  it('filters to non-terminal Applications and joins employer/title/note', async () => {
    const { jobOs } = createTestJobOs();
    const activeId = await seedPursuit(jobOs, {
      employerName: 'Acme',
      title: 'Data scientist',
      noticedAt: '2026-07-20T09:00:00.000Z',
      status: 'applied',
      trackingNote: 'Awaiting screen',
    });
    const terminalId = await seedPursuit(jobOs, {
      employerName: 'Beacon',
      title: 'Closed role',
      noticedAt: '2026-07-21T09:00:00.000Z',
    });
    await jobOs.updateApplicationStatus(terminalId, 'rejected');

    const rows = await jobOs.listOverviewAttention();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({
      applicationId: activeId,
      employerName: 'Acme',
      opportunityTitle: 'Data scientist',
      status: 'applied',
      trackingNote: 'Awaiting screen',
    });
  });

  it('orders by urgency offer → interviewing → applied → researching', async () => {
    let clock = '2026-08-01T10:00:00.000Z';
    const store = createMemoryJobOsStore();
    const bodies = createMemoryJobOsBodyStorage();
    const jobOs = createJobOs({
      store,
      bodies,
      now: () => clock,
      createId: (() => {
        let n = 0;
        return () => `att-${++n}`;
      })(),
    });

    const researchingId = await seedPursuit(jobOs, {
      employerName: 'Research Co',
      title: 'Researching role',
      noticedAt: '2026-07-10T09:00:00.000Z',
    });
    clock = '2026-08-01T11:00:00.000Z';
    const appliedId = await seedPursuit(jobOs, {
      employerName: 'Applied Co',
      title: 'Applied role',
      noticedAt: '2026-07-11T09:00:00.000Z',
      status: 'applied',
    });
    clock = '2026-08-01T12:00:00.000Z';
    const interviewingId = await seedPursuit(jobOs, {
      employerName: 'Interview Co',
      title: 'Interviewing role',
      noticedAt: '2026-07-12T09:00:00.000Z',
      status: 'interviewing',
    });
    clock = '2026-08-01T13:00:00.000Z';
    const offerId = await seedPursuit(jobOs, {
      employerName: 'Offer Co',
      title: 'Offer role',
      noticedAt: '2026-07-13T09:00:00.000Z',
      status: 'offer',
    });

    const rows = await jobOs.listOverviewAttention();
    expect(rows.map((row) => row.applicationId)).toEqual([
      offerId,
      interviewingId,
      appliedId,
      researchingId,
    ]);
  });

  it('breaks ties within a status by latest Decision Event for the Application', async () => {
    let clock = '2026-08-01T10:00:00.000Z';
    const store = createMemoryJobOsStore();
    const bodies = createMemoryJobOsBodyStorage();
    const jobOs = createJobOs({
      store,
      bodies,
      now: () => clock,
      createId: (() => {
        let n = 0;
        return () => `tie-${++n}`;
      })(),
    });

    const olderId = await seedPursuit(jobOs, {
      employerName: 'Older Applied',
      title: 'Older',
      noticedAt: '2026-07-20T09:00:00.000Z',
      status: 'applied',
    });
    clock = '2026-08-01T12:00:00.000Z';
    const newerId = await seedPursuit(jobOs, {
      employerName: 'Newer Applied',
      title: 'Newer',
      noticedAt: '2026-07-01T09:00:00.000Z',
      status: 'applied',
    });

    const rows = await jobOs.listOverviewAttention();
    expect(rows.map((row) => row.applicationId)).toEqual([newerId, olderId]);
  });

  it('falls back to Opportunity noticedAt when no Application Decision Events exist', async () => {
    const store = createMemoryJobOsStore();
    const bodies = createMemoryJobOsBodyStorage();
    const jobOs = createJobOs({
      store,
      bodies,
      now: () => '2026-08-01T10:00:00.000Z',
      createId: (() => {
        let n = 0;
        return () => `fb-${++n}`;
      })(),
    });

    const earlyEmployer = await jobOs.createEmployer({
      name: 'Early',
      sizeTier: 'startup',
      prestigeTier: 'low',
      sector: 'technology',
    });
    const lateEmployer = await jobOs.createEmployer({
      name: 'Late',
      sizeTier: 'startup',
      prestigeTier: 'low',
      sector: 'technology',
    });
    expect(earlyEmployer.status).toBe('created');
    expect(lateEmployer.status).toBe('created');
    if (
      earlyEmployer.status !== 'created' ||
      lateEmployer.status !== 'created'
    ) {
      return;
    }

    const earlyOpp = await jobOs.createOpportunity({
      employerId: earlyEmployer.employer.id,
      noticedAt: '2026-07-01T09:00:00.000Z',
      title: 'Early notice',
    });
    const lateOpp = await jobOs.createOpportunity({
      employerId: lateEmployer.employer.id,
      noticedAt: '2026-07-20T09:00:00.000Z',
      title: 'Late notice',
    });
    expect(earlyOpp.status).toBe('created');
    expect(lateOpp.status).toBe('created');
    if (earlyOpp.status !== 'created' || lateOpp.status !== 'created') {
      return;
    }

    const earlyApp = await store.insertApplication({
      id: 'app-early',
      opportunityId: earlyOpp.opportunity.id,
      status: 'researching',
    });
    const lateApp = await store.insertApplication({
      id: 'app-late',
      opportunityId: lateOpp.opportunity.id,
      status: 'researching',
    });

    const rows = await jobOs.listOverviewAttention();
    expect(rows.map((row) => row.applicationId)).toEqual([
      lateApp.id,
      earlyApp.id,
    ]);
  });

  it('does not reshuffle when only the Tracking note changes', async () => {
    let clock = '2026-08-01T10:00:00.000Z';
    const store = createMemoryJobOsStore();
    const bodies = createMemoryJobOsBodyStorage();
    const jobOs = createJobOs({
      store,
      bodies,
      now: () => clock,
      createId: (() => {
        let n = 0;
        return () => `note-${++n}`;
      })(),
    });

    const firstId = await seedPursuit(jobOs, {
      employerName: 'First',
      title: 'First role',
      noticedAt: '2026-07-10T09:00:00.000Z',
      status: 'applied',
    });
    clock = '2026-08-01T11:00:00.000Z';
    const secondId = await seedPursuit(jobOs, {
      employerName: 'Second',
      title: 'Second role',
      noticedAt: '2026-07-11T09:00:00.000Z',
      status: 'applied',
    });

    const before = (await jobOs.listOverviewAttention()).map(
      (row) => row.applicationId,
    );
    expect(before).toEqual([secondId, firstId]);

    clock = '2026-08-01T20:00:00.000Z';
    await jobOs.updateTrackingNote(firstId, 'Edited tracker only');

    const after = await jobOs.listOverviewAttention();
    expect(after.map((row) => row.applicationId)).toEqual(before);
    expect(after.find((row) => row.applicationId === firstId)?.trackingNote).toBe(
      'Edited tracker only',
    );
  });
});
