import { describe, expect, it } from 'vitest';
import { cfa, getPageData } from '@/data';
import { assertValidCfaPage } from '@/data/validate';

describe('cfa.json', () => {
  it('is reachable through getPageData', () => {
    expect(getPageData('/labs/cfa')).toBe(cfa);
  });

  it('lists the ten Level I topics with the 2027 exam weights', () => {
    expect(cfa.weights.year).toBe(2027);
    expect(
      cfa.syllabus.modules.map((entry) => [
        entry.name,
        entry.weight.min,
        entry.weight.max,
      ]),
    ).toEqual([
      ['Ethical and Professional Standards', 10, 15],
      ['Quantitative Methods', 11, 14],
      ['Economics', 6, 9],
      ['Financial Statement Analysis', 11, 14],
      ['Corporate Finance', 6, 9],
      ['Equities', 11, 14],
      ['Fixed Income', 11, 14],
      ['Derivatives and Risk Management', 6, 9],
      ['Alternative Investments', 6, 9],
      ['Portfolio Construction', 8, 12],
    ]);
  });

  it('gives every Module readings with unique ids', () => {
    const ids = cfa.syllabus.modules.flatMap((entry) =>
      entry.readings.map((reading) => reading.id),
    );
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of cfa.syllabus.modules) {
      expect(entry.readings.length).toBeGreaterThan(0);
      for (const reading of entry.readings) {
        expect(reading.id.startsWith(`${entry.id}-`)).toBe(true);
      }
    }
  });

  it('has an ISO exam date', () => {
    expect(cfa.exam.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('rejects anything but copy and syllabus (no question content in the repo)', () => {
    expect(() => assertValidCfaPage({ ...cfa, questions: [] })).toThrow(
      /unexpected top-level key "questions"/,
    );
    expect(() => assertValidCfaPage(cfa)).not.toThrow();
  });

  it('rejects duplicate reading ids', () => {
    const [first, ...rest] = cfa.syllabus.modules;
    const broken = {
      ...cfa,
      syllabus: {
        modules: [
          { ...first, readings: [first.readings[0], first.readings[0]] },
          ...rest,
        ],
      },
    };
    expect(() => assertValidCfaPage(broken)).toThrow(/duplicate reading id/);
  });
});
