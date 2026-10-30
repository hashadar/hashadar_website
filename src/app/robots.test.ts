import { describe, expect, it } from 'vitest';
import robots from '@/app/robots';

describe('robots', () => {
  it('leaves Court Board crawlable so its noindex header and meta are seen', () => {
    // Disallowing the path would hide the noindex from crawlers and let a bare URL be listed.
    const rules = robots().rules;
    const disallow = (Array.isArray(rules) ? rules : [rules]).flatMap((rule) => rule.disallow ?? []);
    expect(disallow.some((path) => path.includes('court-board'))).toBe(false);
  });
});
