import { describe, expect, it } from 'vitest';
import {
  applyMetadataPatchToMarkdown,
  checkEmployerInRegistry,
  mergeModelFieldsIntoMarkdown,
  parseJobDescriptionFrontmatter,
  serializeJobDescriptionFrontmatter,
} from './job-description-frontmatter';

const sample = `---
collectedAt: 2026-01-15T00:00:00.000Z
title: Analyst
---

Do analysis.
`;

describe('job-description-frontmatter', () => {
  it('round-trips the canonical frontmatter set', () => {
    const parsed = parseJobDescriptionFrontmatter(sample);
    expect(parsed.status).toBe('ok');
    if (parsed.status !== 'ok') return;

    const body = serializeJobDescriptionFrontmatter(
      {
        ...parsed.data,
        employerId: 'emp-1',
        seniority: 'mid',
        compensationCurrency: 'GBP',
        compensationMin: 50000,
        compensationMax: 60000,
        compensationPeriod: 'year',
      },
      parsed.content,
    );

    expect(body).toContain('employerId: emp-1');
    expect(body).toContain('compensationCurrency: GBP');
    expect(body).toContain('Do analysis.');
  });

  it('merges model-only fields into markdown for SSOT repair', () => {
    const merged = mergeModelFieldsIntoMarkdown(sample, {
      employerId: 'emp-9',
      compensationCurrency: 'USD',
      compensationMin: 100000,
    });
    expect(merged).toContain('employerId: emp-9');
    expect(merged).toContain('compensationCurrency: USD');
    expect(merged).toContain('title: Analyst');
  });

  it('applies metadata patches by rewriting frontmatter', () => {
    const result = applyMetadataPatchToMarkdown(sample, {
      employerId: 'emp-2',
      seniority: 'senior',
    });
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.body).toContain('employerId: emp-2');
    expect(result.body).toContain('seniority: senior');
  });

  it('checks employer registry membership', () => {
    expect(checkEmployerInRegistry(undefined, ['emp-1'])).toEqual({
      status: 'unset',
    });
    expect(checkEmployerInRegistry('emp-1', ['emp-1'])).toEqual({
      status: 'ok',
    });
    expect(checkEmployerInRegistry('emp-missing', ['emp-1'])).toEqual({
      status: 'unknown',
      employerId: 'emp-missing',
    });
  });
});
