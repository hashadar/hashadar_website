import { afterEach, describe, expect, it } from 'vitest';
import {
  createServerPullWorkbookSource,
  getDefaultWmw,
  resetDefaultWmwCache,
  resolveDefaultWorkbookSource,
} from '@/lib/wmw-default';
import { createSampleWorkbookRaw } from '@/lib/wmw/fixtures/sample-workbook';
import { WMW_WORKBOOK_NOT_CONFIGURED_REASON } from '@/lib/wmw/config';

afterEach(() => {
  resetDefaultWmwCache();
});

describe('WMW default wiring (CI without Google secrets)', () => {
  it('defaults to a Server Action workbook source', async () => {
    const source = resolveDefaultWorkbookSource();
    await expect(source.pullTabs()).rejects.toThrow(
      /not configured \(see #181\)/i,
    );
  });

  it('allows injecting a pullTabs override for tests', async () => {
    const raw = createSampleWorkbookRaw();
    const source = createServerPullWorkbookSource(async () => raw);
    await expect(source.pullTabs()).resolves.toEqual(raw);
  });

  it('builds a facade that loads an empty Snapshot without crashing', async () => {
    const client = await getDefaultWmw();
    await expect(client.getSnapshot()).resolves.toBeNull();
  });

  it('Refresh fails clearly when the Workbook source is not configured', async () => {
    const client = await getDefaultWmw({
      pullTabs: async () => {
        throw new Error(WMW_WORKBOOK_NOT_CONFIGURED_REASON);
      },
    });
    await expect(client.refresh()).rejects.toThrow(/not configured/i);
  });
});
