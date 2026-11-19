import { describe, expect, it } from 'vitest';
import {
  normaliseAnswer,
  normaliseMathDelimiters,
  parseExtractionOutput,
  parseImportJson,
  stripOptionLabel,
  stripQuestionNumber,
} from '@/lib/cfa/extraction';
import { testSyllabus } from '@/test/fixtures/cfa';

const placeholder = {
  stem: 'A widget costs $x$ today. What is it worth next year?',
  options: { A: '10', B: '11', C: '12' },
  answer: 'B',
  explanation: 'Grow by $10\\%$: $$10 \\times 1.1 = 11$$',
  los: 'calculate a placeholder value',
  calculator: null,
};

describe('parseExtractionOutput', () => {
  it('reads the documented shape', () => {
    const result = parseExtractionOutput(JSON.stringify({ questions: [placeholder] }));
    expect(result).toEqual({
      ok: true,
      warnings: [],
      questions: [
        {
          stem: placeholder.stem,
          options: ['10', '11', '12'],
          answer: 'B',
          explanation: placeholder.explanation,
          calculator: null,
        },
      ],
    });
  });

  it('accepts a bare object or array, and code fences', () => {
    const bare = parseExtractionOutput('```json\n' + JSON.stringify(placeholder) + '\n```');
    expect(bare.ok && bare.questions).toHaveLength(1);
    const list = parseExtractionOutput([placeholder, placeholder]);
    expect(list.ok && list.questions).toHaveLength(2);
  });

  it('never invents an answer and keeps a missing explanation empty', () => {
    const result = parseExtractionOutput({
      questions: [{ ...placeholder, answer: 'not shown', explanation: '' }],
    });
    expect(result.ok && result.questions[0]).toMatchObject({
      answer: null,
      explanation: null,
    });
  });

  it('pads bad option sets to three and warns', () => {
    const result = parseExtractionOutput({
      questions: [{ stem: 'Placeholder?', options: ['A. one', 'B. two'] }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.questions[0].options).toEqual(['one', 'two', '']);
    expect(result.warnings[0]).toMatch(/three options/);
  });

  it('skips items without a stem and errors when nothing is left', () => {
    expect(parseExtractionOutput({ questions: [{ options: {} }] })).toEqual({
      ok: false,
      error: 'Question 1 had no stem and was skipped.',
    });
    expect(parseExtractionOutput('not json').ok).toBe(false);
    expect(parseExtractionOutput({ nothing: true }).ok).toBe(false);
  });

  it('normalises bracket maths delimiters to dollars', () => {
    const result = parseExtractionOutput({
      questions: [{ ...placeholder, stem: 'Solve \\( a+b \\) and \\[ c \\]' }],
    });
    expect(result.ok && result.questions[0].stem).toBe('Solve $a+b$ and $$c$$');
  });
});

describe('stripQuestionNumber', () => {
  it('drops a question number or label in front of the stem', () => {
    expect(stripQuestionNumber('1. A placeholder widget costs')).toBe('A placeholder widget costs');
    expect(stripQuestionNumber('12) Which option')).toBe('Which option');
    expect(stripQuestionNumber('3: Which option')).toBe('Which option');
    expect(stripQuestionNumber('Q4. Which option')).toBe('Which option');
    expect(stripQuestionNumber('Question 5: Which option')).toBe('Which option');
    expect(stripQuestionNumber('Question 6\nWhich option')).toBe('Which option');
    expect(stripQuestionNumber('**7.** Which option')).toBe('Which option');
  });

  it('keeps stems that merely start with a number', () => {
    expect(stripQuestionNumber('1.5 million placeholder shares')).toBe('1.5 million placeholder shares');
    expect(stripQuestionNumber('Q3 placeholder sales rose')).toBe('Q3 placeholder sales rose');
    expect(stripQuestionNumber('100 placeholder units')).toBe('100 placeholder units');
    expect(stripQuestionNumber('1.')).toBe('1.');
  });

  it('applies to extracted and imported stems', () => {
    const numbered = { ...placeholder, stem: '2. Placeholder stem?' };
    const extracted = parseExtractionOutput({ questions: [numbered] });
    expect(extracted.ok && extracted.questions[0].stem).toBe('Placeholder stem?');
    const imported = parseImportJson(JSON.stringify([numbered]), testSyllabus, {
      moduleId: 'alpha',
      readingId: 'alpha-one',
      source: null,
    });
    expect(imported.items[0].stem).toBe('Placeholder stem?');
  });
});

describe('small normalisers', () => {
  it('reads answer letters in common forms', () => {
    expect(normaliseAnswer('b')).toBe('B');
    expect(normaliseAnswer('(C)')).toBe('C');
    expect(normaliseAnswer('A.')).toBe('A');
    expect(normaliseAnswer('Answer: B')).toBe('B');
    expect(normaliseAnswer('D')).toBeNull();
    expect(normaliseAnswer('B and C')).toBeNull();
    expect(normaliseAnswer(2)).toBeNull();
  });

  it('strips option labels but not content', () => {
    expect(stripOptionLabel('A. 4.5%')).toBe('4.5%');
    expect(stripOptionLabel('(b) Higher')).toBe('Higher');
    expect(stripOptionLabel('C) $x$')).toBe('$x$');
    expect(stripOptionLabel('Above par')).toBe('Above par');
  });

  it('leaves dollar maths untouched', () => {
    expect(normaliseMathDelimiters('$x$ and $$y$$')).toBe('$x$ and $$y$$');
  });
});

describe('parseImportJson', () => {
  const defaults = { moduleId: 'alpha', readingId: 'alpha-two', source: 'Placeholder set' };

  it('imports valid items with defaults for Module, Reading and source', () => {
    const result = parseImportJson(
      JSON.stringify({ questions: [placeholder] }),
      testSyllabus,
      defaults,
    );
    expect(result.errors).toEqual([]);
    expect(result.items[0]).toMatchObject({
      module: 'alpha',
      reading: 'alpha-two',
      los: 'calculate a placeholder value',
      answer: 'B',
      source: 'Placeholder set',
      explanationIsAiDrafted: false,
      screenshotKeys: [],
    });
  });

  it('resolves Module and Reading by name', () => {
    const result = parseImportJson(
      JSON.stringify([
        { ...placeholder, module: 'beta module', reading: 'Beta Reading One' },
      ]),
      testSyllabus,
      defaults,
    );
    expect(result.items[0]).toMatchObject({ module: 'beta', reading: 'beta-one' });
  });

  it('does not borrow the default Reading for another Module', () => {
    const result = parseImportJson(
      JSON.stringify([{ ...placeholder, module: 'gamma' }]),
      testSyllabus,
      defaults,
    );
    expect(result.errors).toEqual([
      { index: 1, message: 'Unknown or missing reading.' },
    ]);
  });

  it('reports items without an answer or three options', () => {
    const result = parseImportJson(
      JSON.stringify([
        { ...placeholder, answer: null },
        { ...placeholder, options: { A: 'x', B: 'y' } },
        { ...placeholder, options: { A: 'x', B: 'y', C: 'z', D: 'w' } },
        placeholder,
      ]),
      testSyllabus,
      defaults,
    );
    expect(result.items).toHaveLength(1);
    expect(result.errors.map((error) => error.index)).toEqual([1, 2, 3]);
  });

  it('keeps the AI-drafted flag only with an explanation', () => {
    const result = parseImportJson(
      JSON.stringify([
        { ...placeholder, explanationIsAiDrafted: true },
        { ...placeholder, explanation: null, explanationIsAiDrafted: true },
      ]),
      testSyllabus,
      defaults,
    );
    expect(result.items.map((item) => item.explanationIsAiDrafted)).toEqual([
      true,
      false,
    ]);
  });

  it('rejects text that is not JSON', () => {
    expect(parseImportJson('{', testSyllabus, defaults).errors[0].message).toBe(
      'Not valid JSON.',
    );
  });
});
