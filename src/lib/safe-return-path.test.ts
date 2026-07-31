import { describe, expect, it } from 'vitest';
import { safeReturnPath } from '@/lib/safe-return-path';

describe('safeReturnPath', () => {
  it('defaults to /admin when missing', () => {
    expect(safeReturnPath(null)).toBe('/admin');
    expect(safeReturnPath(undefined)).toBe('/admin');
    expect(safeReturnPath('')).toBe('/admin');
  });

  it('accepts same-origin relative paths', () => {
    expect(safeReturnPath('/admin')).toBe('/admin');
    expect(safeReturnPath('/labs/job-os')).toBe('/labs/job-os');
  });

  it('rejects open redirects', () => {
    expect(safeReturnPath('https://evil.example')).toBe('/admin');
    expect(safeReturnPath('//evil.example')).toBe('/admin');
    expect(safeReturnPath('/\\evil')).toBe('/admin');
  });
});
