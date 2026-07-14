import { describe, expect, it } from 'vitest';
import {
  createAmplifyThemeLabelOverrideDeps,
  type AmplifyThemeLabelOverrideModelClient,
} from './job-market-theme-labels-amplify';
import {
  listThemeLabelOverrides,
  setThemeLabelOverride,
} from './job-market-theme-labels';

function createMemoryClient(): AmplifyThemeLabelOverrideModelClient & {
  rows: Map<string, { clusterKey: string; label: string }>;
} {
  const rows = new Map<string, { clusterKey: string; label: string }>();

  return {
    rows,
    async list() {
      return { data: [...rows.values()], errors: null };
    },
    async get(input) {
      return { data: rows.get(input.id) ?? null, errors: null };
    },
    async create(input) {
      rows.set(input.id, {
        clusterKey: input.clusterKey,
        label: input.label,
      });
      return { data: rows.get(input.id) ?? null, errors: null };
    },
    async update(input) {
      const existing = rows.get(input.id);
      if (!existing) {
        return { data: null, errors: [{ message: 'Not found' }] };
      }
      rows.set(input.id, {
        clusterKey: input.clusterKey ?? existing.clusterKey,
        label: input.label ?? existing.label,
      });
      return { data: rows.get(input.id) ?? null, errors: null };
    },
  };
}

describe('job-market-theme-labels amplify adapter', () => {
  it('lists and upserts overrides through the facade seam', async () => {
    const client = createMemoryClient();
    const deps = createAmplifyThemeLabelOverrideDeps(client);

    await setThemeLabelOverride('1', 'Visual analytics demand', deps);
    await setThemeLabelOverride('1', 'Updated analytics demand', deps);

    const overrides = await listThemeLabelOverrides(deps);
    expect(overrides).toEqual([
      { clusterKey: '1', label: 'Updated analytics demand' },
    ]);
  });
});
