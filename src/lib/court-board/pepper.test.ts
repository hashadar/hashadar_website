import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCourtBoardPepper, resetCourtBoardPepperCache } from './pepper';

const LONG = 'a-pepper-of-at-least-16-chars';

describe('getCourtBoardPepper', () => {
  beforeEach(() => {
    resetCourtBoardPepperCache();
    vi.stubEnv('COURT_BOARD_PEPPER', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('prefers COURT_BOARD_PEPPER and does not call SSM', async () => {
    vi.stubEnv('COURT_BOARD_PEPPER', ` ${LONG} `);
    const fetcher = vi.fn();
    await expect(getCourtBoardPepper(fetcher)).resolves.toBe(LONG);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('rejects a short COURT_BOARD_PEPPER', async () => {
    vi.stubEnv('COURT_BOARD_PEPPER', 'short');
    await expect(getCourtBoardPepper(vi.fn())).rejects.toThrow(/16 characters/);
  });

  it('falls back to the courtboard.pepper Hosting secret and caches it', async () => {
    const fetcher = vi.fn().mockResolvedValue(`  ${LONG}\n`);
    await expect(getCourtBoardPepper(fetcher)).resolves.toBe(LONG);
    await expect(getCourtBoardPepper(fetcher)).resolves.toBe(LONG);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(
      expect.objectContaining({ secretName: 'courtboard.pepper' }),
    );
  });

  it('throws a clear error when the secret is missing or too short', async () => {
    await expect(getCourtBoardPepper(vi.fn().mockResolvedValue(null))).rejects.toThrow(
      /courtboard\.pepper/,
    );
    await expect(getCourtBoardPepper(vi.fn().mockResolvedValue('tiny'))).rejects.toThrow(
      /not configured/,
    );
  });
});
