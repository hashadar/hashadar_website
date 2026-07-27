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
  } satisfies AmplifyJobOsModelsClient;

  return { client, create };
}

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
      isAnon: false,
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ isAnon: false }),
    );
  });
});
