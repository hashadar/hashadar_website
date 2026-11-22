import { partLetter } from '@/lib/cfa/groups';
import { newCfaId } from '@/lib/cfa/paths';
import { resolveModuleRef, resolveReadingRef } from '@/lib/cfa/syllabus';
import {
  CFA_ANSWERS,
  type CfaAnswer,
  type CfaOptions,
  type CfaQuestionInput,
  type CfaSyllabus,
} from '@/lib/cfa/types';

/**
 * One Question as returned by Extraction (and accepted by Paste JSON):
 * {"questions":[{"stem","options":{"A","B","C"},"answer","explanation","calculator","part","group"}]}
 * `part` labels one part of a multi-part question ("a"); `group` links Paste
 * JSON items that are parts of the same question.
 */
export type ExtractedQuestion = {
  stem: string;
  options: CfaOptions;
  answer: CfaAnswer | null;
  explanation: string | null;
  calculator: string | null;
  part: string | null;
  group: string | null;
};

/** Shown on the Paste JSON page. Placeholder values only. */
export const IMPORT_SCHEMA_EXAMPLE = `{
  "questions": [
    {
      "stem": "Question text in Markdown. Maths as $x$ or $$x$$; tables as Markdown tables.",
      "options": { "A": "First option", "B": "Second option", "C": "Third option" },
      "answer": "B",
      "explanation": "Optional worked explanation (Markdown).",
      "los": "Optional learning outcome",
      "calculator": "Optional calculator keystrokes",
      "module": "Optional module id or name (else the default above)",
      "reading": "Optional reading id or name (else the default above)",
      "source": "Optional source (else the default above)",
      "explanationIsAiDrafted": false,
      "group": "Optional: items with the same group are parts of one question",
      "part": "Optional part label, e.g. a"
    }
  ]
}`;

export type ExtractionResult =
  | { ok: true; questions: ExtractedQuestion[]; warnings: string[] }
  | { ok: false; error: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function cleanText(value: unknown): string | null {
  if (typeof value === 'number') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\r\n/g, '\n').trim();
  return trimmed ? normaliseMathDelimiters(trimmed) : null;
}

/** Convert `\( … \)` / `\[ … \]` maths to the `$…$` / `$$…$$` that remark-math reads. */
export function normaliseMathDelimiters(text: string): string {
  return text
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, body: string) => `$$${body.trim()}$$`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, body: string) => `$${body.trim()}$`);
}

const SUB_PART = String.raw`\(\s*[a-z]\s*\)`;
const LEADING_LABEL = new RegExp(
  String.raw`^\s*(?:\*\*|__)?(?:` +
    [
      // Question 5 / Question 5: / Question 1b: / Question 1 (b):
      String.raw`question\s*\d{1,3}(?:\s*${SUB_PART}|[a-z])?\s*[.):\-–]?`,
      // Q4. / Q4b. / Q4 (b)
      String.raw`q\s*\d{1,3}(?:\s*${SUB_PART}\s*[.:]?|[a-z]?\s*[.):])`,
      // 1. / 12) / 3: / 1a. / 1(a) / 1 (b):
      String.raw`\d{1,3}(?:\s*${SUB_PART}\s*[.:]?|[a-z]?\s*[.):])`,
      // Part a: / Part (b)
      String.raw`part\s+(?:${SUB_PART}\s*[.:\-–]?|[a-z]\s*[.):\-–])`,
      // (c) / (c):
      String.raw`${SUB_PART}\s*[.:]?`,
      // a)
      String.raw`[a-z]\)`,
    ].join('|') +
    String.raw`)(?:\*\*|__)?\s+`,
  'i',
);

/**
 * Drop a question number or part label in front of the stem: `1.`, `12)`,
 * `3:`, `Q4.`, `Question 5`, and parts such as `1a.`, `1(a)`, `1 (b)`, `(c)`,
 * `a)`, `Part a:`, `Question 1(b):`, optionally in bold. A number followed by
 * a part label (`1. (a)`) loses both. Leaves `1.5 million…`, `Q3 sales…` and
 * `A placeholder firm…` alone.
 */
export function stripQuestionNumber(stem: string): string {
  let current = stem;
  for (let pass = 0; pass < 2; pass += 1) {
    const stripped = current.replace(LEADING_LABEL, '');
    if (stripped === current || !stripped.trim()) break;
    current = stripped;
  }
  return current;
}

/** Part label as stored and shown: `a`, `(B)`, `1b`, `Part c` → `a`, `b`, `b`, `c`. */
export function normalisePart(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const label = String(value)
    .trim()
    .toLowerCase()
    .replace(/^part\s*/, '')
    .replace(/^\d{1,3}(?=\s*\(?[a-z])/, '')
    .replace(/[^a-z0-9]/g, '');
  return /^[a-z0-9]{1,4}$/.test(label) ? label : null;
}

function groupKey(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value !== 'string') return null;
  return value.trim() || null;
}

/** Drop a leading option label such as `A.`, `(B)`, `C)` or `A:`. */
export function stripOptionLabel(text: string): string {
  return text.replace(/^\s*\(?[A-Ca-c]\s*[).:\-–]\s+/, '').trim();
}

/** Read an answer letter from `B`, `b.`, `(C)`, `Option A`, `Answer: B`. */
export function normaliseAnswer(value: unknown): CfaAnswer | null {
  if (typeof value !== 'string') return null;
  const match = value
    .trim()
    .toUpperCase()
    .match(/^(?:(?:OPTION|ANSWER|CORRECT ANSWER)\s*[:\-]?\s*)?\(?([ABC])\)?\.?$/);
  const letter = match?.[1];
  return letter && (CFA_ANSWERS as readonly string[]).includes(letter)
    ? (letter as CfaAnswer)
    : null;
}

function readOptions(value: unknown): { options: string[]; shape: 'ok' | 'bad' } {
  const record = asRecord(value);
  if (record) {
    const options = CFA_ANSWERS.map((letter) =>
      stripOptionLabel(cleanText(record[letter] ?? record[letter.toLowerCase()]) ?? ''),
    );
    const extraKeys = Object.keys(record).filter(
      (key) => !['A', 'B', 'C', 'a', 'b', 'c'].includes(key),
    );
    return { options, shape: extraKeys.length > 0 ? 'bad' : 'ok' };
  }
  if (Array.isArray(value)) {
    const options = value.map((item) => {
      const text =
        typeof item === 'string' || typeof item === 'number'
          ? item
          : asRecord(item)?.text;
      return stripOptionLabel(cleanText(text) ?? '');
    });
    return { options, shape: options.length === 3 ? 'ok' : 'bad' };
  }
  return { options: [], shape: 'bad' };
}

function toThree(options: string[]): CfaOptions {
  return [options[0] ?? '', options[1] ?? '', options[2] ?? ''];
}

function questionItems(parsed: unknown): unknown[] | null {
  if (Array.isArray(parsed)) return parsed;
  const record = asRecord(parsed);
  if (!record) return null;
  if (Array.isArray(record.questions)) return record.questions;
  if ('stem' in record) return [record];
  return null;
}

function parseJson(raw: string | unknown): unknown {
  if (typeof raw !== 'string') return raw;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return JSON.parse((fenced?.[1] ?? raw).trim());
}

/**
 * Lenient validation of Extraction output for the review form: keeps every
 * Question that has a stem, pads or trims options to three with a warning,
 * and never invents an answer.
 */
export function parseExtractionOutput(raw: string | unknown): ExtractionResult {
  let parsed: unknown;
  try {
    parsed = parseJson(raw);
  } catch {
    return { ok: false, error: 'The model reply was not valid JSON.' };
  }
  const items = questionItems(parsed);
  if (!items) {
    return { ok: false, error: 'The model reply had no questions.' };
  }

  const warnings: string[] = [];
  const questions: ExtractedQuestion[] = [];
  items.forEach((item, index) => {
    const record = asRecord(item);
    const stem = cleanText(record?.stem);
    if (!record || !stem) {
      warnings.push(`Question ${index + 1} had no stem and was skipped.`);
      return;
    }
    const { options, shape } = readOptions(record.options);
    if (shape === 'bad' || options.filter(Boolean).length !== 3) {
      warnings.push(
        `Question ${index + 1}: expected exactly three options (A, B, C); check them.`,
      );
    }
    questions.push({
      stem: stripQuestionNumber(stem),
      options: toThree(options),
      answer: normaliseAnswer(record.answer),
      explanation: cleanText(record.explanation),
      calculator: cleanText(record.calculator),
      part: normalisePart(record.part),
      group: groupKey(record.group),
    });
  });

  if (questions.length === 0) {
    return { ok: false, error: warnings[0] ?? 'No questions found.' };
  }
  return { ok: true, questions, warnings };
}

export type ImportDefaults = {
  moduleId: string | null;
  readingId: string | null;
  source: string | null;
};

export type ImportResult = {
  items: CfaQuestionInput[];
  errors: Array<{ index: number; message: string }>;
};

/**
 * Strict validation for Paste JSON import: same schema as Extraction, plus
 * optional `module`, `reading`, `los`, `source` and `explanationIsAiDrafted`
 * per item (Module/Reading by id or name; defaults fill the gaps). Every item
 * needs exactly three options and an answer.
 *
 * Valid items that share a `group` value become one Question group, ordered as
 * pasted, each labelled by its `part` (else a, b, c… in order). A `group` used
 * by only one valid item is ignored.
 */
export function parseImportJson(
  text: string,
  syllabus: CfaSyllabus,
  defaults: ImportDefaults,
  options: { newGroupId?: () => string } = {},
): ImportResult {
  let parsed: unknown;
  try {
    parsed = parseJson(text);
  } catch {
    return { items: [], errors: [{ index: 0, message: 'Not valid JSON.' }] };
  }
  const list = questionItems(parsed);
  if (!list) {
    return {
      items: [],
      errors: [{ index: 0, message: 'Expected {"questions": [...]} or an array.' }],
    };
  }

  const items: CfaQuestionInput[] = [];
  const links: Array<{ group: string | null; part: string | null }> = [];
  const errors: ImportResult['errors'] = [];
  list.forEach((item, index) => {
    const position = index + 1;
    const record = asRecord(item);
    const stem = cleanText(record?.stem);
    if (!record || !stem) {
      errors.push({ index: position, message: 'Missing stem.' });
      return;
    }
    const { options, shape } = readOptions(record.options);
    if (shape === 'bad' || options.filter(Boolean).length !== 3) {
      errors.push({
        index: position,
        message: 'Needs exactly three non-empty options (A, B, C).',
      });
      return;
    }
    const answer = normaliseAnswer(record.answer);
    if (!answer) {
      errors.push({ index: position, message: 'Missing answer (A, B or C).' });
      return;
    }
    const moduleRef = cleanText(record.module) ?? defaults.moduleId;
    const resolvedModule = resolveModuleRef(syllabus, moduleRef);
    if (!resolvedModule) {
      errors.push({ index: position, message: 'Unknown or missing module.' });
      return;
    }
    const readingRef =
      cleanText(record.reading) ??
      (resolvedModule.id === defaults.moduleId ? defaults.readingId : null);
    const reading = resolveReadingRef(resolvedModule, readingRef);
    if (!reading) {
      errors.push({ index: position, message: 'Unknown or missing reading.' });
      return;
    }
    const explanation = cleanText(record.explanation);
    items.push({
      module: resolvedModule.id,
      reading: reading.id,
      los: cleanText(record.los),
      stem: stripQuestionNumber(stem),
      options: toThree(options),
      answer,
      explanation,
      explanationIsAiDrafted:
        explanation !== null && record.explanationIsAiDrafted === true,
      calculator: cleanText(record.calculator),
      source: cleanText(record.source) ?? defaults.source,
      screenshotKeys: [],
      groupId: null,
      groupOrder: null,
      groupPart: null,
    });
    links.push({ group: groupKey(record.group), part: normalisePart(record.part) });
  });

  return {
    items: linkImportGroups(items, links, options.newGroupId ?? (() => newCfaId('group'))),
    errors,
  };
}

function linkImportGroups(
  items: CfaQuestionInput[],
  links: Array<{ group: string | null; part: string | null }>,
  newGroupId: () => string,
): CfaQuestionInput[] {
  const sizes = new Map<string, number>();
  for (const { group } of links) {
    if (group) sizes.set(group, (sizes.get(group) ?? 0) + 1);
  }
  const ids = new Map<string, string>();
  const nextOrder = new Map<string, number>();
  return items.map((item, index) => {
    const { group, part } = links[index];
    if (!group || (sizes.get(group) ?? 0) < 2) return item;
    if (!ids.has(group)) ids.set(group, newGroupId());
    const order = nextOrder.get(group) ?? 0;
    nextOrder.set(group, order + 1);
    return {
      ...item,
      groupId: ids.get(group) ?? null,
      groupOrder: order,
      groupPart: part ?? partLetter(order),
    };
  });
}
