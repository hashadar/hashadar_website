import { afterEach, describe, expect, it } from 'vitest';
import {
  getDefaultWmw,
  resetDefaultWmwCache,
  resolveDefaultWorkbookSource,
} from '@/lib/wmw-default';

afterEach(() => {
  resetDefaultWmwCache();
});

describe('WMW default wiring (CI without Google secrets)', () => {
  it('resolves an unavailable Workbook source when spreadsheet secrets are absent', async () => {
    const source = resolveDefaultWorkbookSource();
    await expect(source.pullTabs()).rejects.toThrow(/not configured/i);
  });

  it('builds a facade that loads an empty Snapshot without crashing', async () => {
    const client = await getDefaultWmw();
    await expect(client.getSnapshot()).resolves.toBeNull();
  });

  it('Refresh fails clearly when the Workbook source is not configured', async () => {
    const client = await getDefaultWmw();
    await expect(client.refresh()).rejects.toThrow(/not configured/i);
  });
});
