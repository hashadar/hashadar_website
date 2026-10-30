import { describe, expect, it } from 'vitest';
import { metadata } from './layout';

describe('Court Board layout metadata', () => {
  it('stays out of search indexes', () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it('stops phones auto-linking numbers, which breaks hydration', () => {
    expect(metadata.formatDetection).toMatchObject({ telephone: false });
  });
});
