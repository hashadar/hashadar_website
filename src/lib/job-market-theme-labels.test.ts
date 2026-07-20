import { describe, expect, it } from 'vitest';
import {
  listThemeLabelOverrides,
  setThemeLabelOverride,
  type ThemeLabelOverrideRecord,
} from './job-market-theme-labels';

describe('job-market-theme-labels facade', () => {
  it('lists stored theme label overrides', async () => {
    const overrides: ThemeLabelOverrideRecord[] = [
      { clusterKey: '1', label: 'Visual analytics demand' },
    ];

    const result = await listThemeLabelOverrides({
      listOverrides: async () => overrides,
    });

    expect(result).toEqual(overrides);
  });

  it('rejects blank override labels', async () => {
    await expect(
      setThemeLabelOverride('0', '   ', {
        saveOverride: async () => undefined,
      }),
    ).rejects.toThrow('Theme label override cannot be empty');
  });

  it('persists a trimmed override label by cluster key', async () => {
    const saved: ThemeLabelOverrideRecord[] = [];

    await setThemeLabelOverride('0', '  Core data engineering demand  ', {
      saveOverride: async (record) => {
        saved.push(record);
      },
    });

    expect(saved).toEqual([
      { clusterKey: '0', label: 'Core data engineering demand' },
    ]);
  });
});
