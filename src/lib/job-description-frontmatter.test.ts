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
        compensationDisclosure: 'range',
        compensationCurrency: 'GBP',
        compensationMin: 50000,
        compensationMax: 60000,
        compensationPeriod: 'year',
      },
      parsed.content,
    );

    expect(body).toContain('employerId: emp-1');
    expect(body).toContain('compensationDisclosure: range');
    expect(body).toContain('compensationCurrency: GBP');
    expect(body).toContain('Do analysis.');
  });

  it('infers range from legacy numerics and unknown when unset', () => {
    const withBand = parseJobDescriptionFrontmatter(`---
collectedAt: 2026-01-15T00:00:00.000Z
title: Analyst
compensationMin: 50000
compensationMax: 60000
---

Body.
`);
    expect(withBand.status).toBe('ok');
    if (withBand.status === 'ok') {
      expect(withBand.data.compensationDisclosure).toBe('range');
      expect(withBand.data.compensationMin).toBe(50000);
    }

    const withoutPay = parseJobDescriptionFrontmatter(sample);
    expect(withoutPay.status).toBe('ok');
    if (withoutPay.status === 'ok') {
      expect(withoutPay.data.compensationDisclosure).toBe('unknown');
    }
  });

  it('strips numeric pay fields when disclosure is not range', () => {
    const result = applyMetadataPatchToMarkdown(sample, {
      compensationDisclosure: 'competitive',
      compensationCurrency: 'GBP',
      compensationMin: 50000,
      compensationMax: 60000,
    });
    expect(result.status).toBe('ok');
    if (result.status !== 'ok') return;
    expect(result.body).toContain('compensationDisclosure: competitive');
    expect(result.body).not.toContain('compensationCurrency:');
    expect(result.body).not.toContain('compensationMin:');
  });

  it('merges model-only fields into markdown for SSOT repair', () => {
    const merged = mergeModelFieldsIntoMarkdown(sample, {
      employerId: 'emp-9',
      compensationDisclosure: 'range',
      compensationCurrency: 'USD',
      compensationMin: 100000,
      compensationMax: 120000,
    });
    expect(merged).toContain('employerId: emp-9');
    expect(merged).toContain('compensationDisclosure: range');
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
