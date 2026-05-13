import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('resolves conflicting Tailwind utilities with tailwind-merge', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('merges class lists from clsx', () => {
    expect(cn('base', false && 'hidden', 'block')).toBe('base block');
  });
});
