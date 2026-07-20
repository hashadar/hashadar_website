import { describe, expect, it } from 'vitest';
import {
  createEmployer,
  updateEmployer,
  type EmployerRecord,
} from './job-market-employers';
import {
  createAmplifyEmployerDeps,
  type AmplifyEmployerModelClient,
  type AmplifyEmployerRow,
} from './job-market-employers-amplify';

function row(
  overrides: Partial<AmplifyEmployerRow> & Pick<AmplifyEmployerRow, 'id'>,
): AmplifyEmployerRow {
  return {
    name: 'Acme Bank',
    sizeTier: 'enterprise',
    prestigeTier: 'high',
    ...overrides,
  };
}

function createMemoryEmployerClient(
  initial: AmplifyEmployerRow[] = [],
): AmplifyEmployerModelClient {
  const store = new Map(initial.map((item) => [item.id, { ...item }]));
  let nextId = initial.length + 1;

  return {
    async get({ id }) {
      return { data: store.get(id) ?? null };
    },
    async list() {
      return { data: [...store.values()] };
    },
    async create(input) {
      const record = { id: `emp-${nextId++}`, ...input };
      store.set(record.id, record);
      return { data: record };
    },
    async update(input) {
      const existing = store.get(input.id);
      if (!existing) {
        return { data: null, errors: [{ message: 'not found' }] };
      }
      const next = { ...existing, ...input };
      store.set(input.id, next);
      return { data: next };
    },
  };
}

describe('createAmplifyEmployerDeps', () => {
  it('maps Amplify create/list/update into employer facade operations', async () => {
    const client = createMemoryEmployerClient([
      row({ id: 'emp-1', name: 'Alpha Capital' }),
    ]);
    const deps = createAmplifyEmployerDeps(client);

    const listed = await deps.listEmployers();
    expect(listed).toEqual<EmployerRecord[]>([
      {
        id: 'emp-1',
        name: 'Alpha Capital',
        sizeTier: 'enterprise',
        prestigeTier: 'high',
      },
    ]);

    const created = await createEmployer(
      { name: 'Beta Partners', sizeTier: 'startup', prestigeTier: 'low' },
      deps,
    );
    expect(created).toEqual({
      status: 'created',
      employer: {
        id: 'emp-2',
        name: 'Beta Partners',
        sizeTier: 'startup',
        prestigeTier: 'low',
      },
    });

    const updated = await updateEmployer(
      { id: 'emp-1', name: 'Alpha Holdings', sizeTier: 'big4', prestigeTier: 'elite' },
      deps,
    );
    expect(updated).toEqual({
      status: 'updated',
      employer: {
        id: 'emp-1',
        name: 'Alpha Holdings',
        sizeTier: 'big4',
        prestigeTier: 'elite',
      },
    });
  });
});
