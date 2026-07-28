import { describe, expect, it, vi } from 'vitest';
import {
  createAmplifyJobOsStore,
  type AmplifyEmployerRow,
  type AmplifyJobOsModelsClient,
} from '@/lib/job-os-amplify';

function baseEmployer(
  overrides: Partial<AmplifyEmployerRow> = {},
): AmplifyEmployerRow {
  return {
    id: 'emp-1',
    name: 'Acme',
    sizeTier: 'startup',
    prestigeTier: 'mid',
    sector: 'technology',
    isAnon: false,
    ...overrides,
  };
}

function createMockClient(
  listResult: {
    data: Array<AmplifyEmployerRow | null> | null;
    errors?: Array<{ message: string }> | null;
  },
) {
  const create = vi.fn(async (input: Omit<AmplifyEmployerRow, 'id'> & { id?: string }) => ({
    data: baseEmployer({ ...input, id: input.id ?? 'created-1' }),
    errors: null,
  }));

  const client = {
    Employer: {
      get: vi.fn(),
      list: vi.fn(async () => listResult),
      create,
      update: vi.fn(),
    },
    Opportunity: {
      get: vi.fn(),
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    Application: {
      get: vi.fn(),
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    DecisionEvent: {
      get: vi.fn(),
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    VocabularyTerm: {
      get: vi.fn(),
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  } satisfies AmplifyJobOsModelsClient;

  return { client, create };
}

describe('createAmplifyJobOsStore decision events', () => {
  it('omits applicationId on Pass so DynamoDB GSI keys are never null', async () => {
    const create = vi.fn(async (input: Record<string, unknown>) => ({
      data: {
        id: 'evt-1',
        kind: 'opportunity_passed' as const,
        opportunityId: String(input.opportunityId),
        occurredAt: String(input.occurredAt),
      },
      errors: null,
    }));
    const { client } = createMockClient({ data: [] });
    client.DecisionEvent.create = create;

    await createAmplifyJobOsStore(client).appendDecisionEvent({
      id: 'evt-1',
      kind: 'opportunity_passed',
      opportunityId: 'opp-1',
      occurredAt: '2026-07-28T12:00:00.000Z',
    });

    expect(create).toHaveBeenCalledTimes(1);
    const payload = create.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).toEqual({
      id: 'evt-1',
      kind: 'opportunity_passed',
      opportunityId: 'opp-1',
      occurredAt: '2026-07-28T12:00:00.000Z',
    });
    expect(payload).not.toHaveProperty('applicationId');
  });

  it('includes applicationId when Pursue records application_started', async () => {
    const create = vi.fn(async (input: Record<string, unknown>) => ({
      data: {
        id: 'evt-2',
        kind: 'application_started' as const,
        opportunityId: String(input.opportunityId),
        applicationId: String(input.applicationId),
        toStatus: String(input.toStatus),
        occurredAt: String(input.occurredAt),
      },
      errors: null,
    }));
    const { client } = createMockClient({ data: [] });
    client.DecisionEvent.create = create;

    await createAmplifyJobOsStore(client).appendDecisionEvent({
      id: 'evt-2',
      kind: 'application_started',
      opportunityId: 'opp-1',
      applicationId: 'app-1',
      toStatus: 'researching',
      occurredAt: '2026-07-28T12:00:00.000Z',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationId: 'app-1',
        toStatus: 'researching',
      }),
    );
  });
});

describe('createAmplifyJobOsStore employers', () => {
  it('treats missing isAnon as false when listing', async () => {
    const { client } = createMockClient({
      data: [
        {
          id: 'emp-legacy',
          name: 'Legacy Co',
          sizeTier: 'other',
          prestigeTier: 'low',
        },
        baseEmployer({ id: 'emp-2', isAnon: true }),
      ],
    });

    const employers = await createAmplifyJobOsStore(client).listEmployers();
    expect(employers).toEqual([
      expect.objectContaining({ id: 'emp-legacy', isAnon: false }),
      expect.objectContaining({ id: 'emp-2', isAnon: true }),
    ]);
  });

  it('returns recoverable employers when some GraphQL items null out', async () => {
    const { client } = createMockClient({
      data: [null, baseEmployer({ id: 'emp-ok', isAnon: false }), null],
      errors: [
        {
          message:
            "Cannot return null for non-nullable type: 'Boolean' within parent 'Employer'",
        },
      ],
    });

    const employers = await createAmplifyJobOsStore(client).listEmployers();
    expect(employers).toHaveLength(1);
    expect(employers[0]?.id).toBe('emp-ok');
  });

  it('throws when every list item is null and GraphQL returned errors', async () => {
    const { client } = createMockClient({
      data: [null, null],
      errors: [
        {
          message:
            "Cannot return null for non-nullable type: 'Boolean' within parent 'Employer'",
        },
      ],
    });

    await expect(
      createAmplifyJobOsStore(client).listEmployers(),
    ).rejects.toThrow(/Cannot return null for non-nullable type/);
  });

  it('persists isAnon false explicitly on create', async () => {
    const { client, create } = createMockClient({ data: [] });
    await createAmplifyJobOsStore(client).insertEmployer({
      id: 'emp-new',
      name: 'New Co',
      sizeTier: 'startup',
      prestigeTier: 'mid',
      sector: 'technology',
      isAnon: false,
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ isAnon: false }),
    );
  });
});
