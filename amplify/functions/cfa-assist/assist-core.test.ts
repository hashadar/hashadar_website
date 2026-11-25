import { describe, expect, it } from 'vitest';
import {
  ASSIST_MAX_TOKENS,
  assistResultKey,
  buildMessagesBody,
  buildUserPrompt,
  CFA_BUCKET_ENV,
  coerceJsonObject,
  DEFAULT_CFA_MODEL_ID,
  imageFormatForKey,
  isClaudeModelId,
  isValidScreenshotKey,
  MAX_ASSIST_IMAGES,
  messagesReplyText,
  parseAssistArguments,
  systemPromptFor,
} from './assist-core';

const validKey = 'screenshots/capture-0001/1.png';

describe('parseAssistArguments', () => {
  it('accepts an extraction job with screenshot keys and context', () => {
    const result = parseAssistArguments({
      jobId: 'job-12345678',
      task: 'extract',
      screenshotKeys: [validKey, 'screenshots/capture-0001/2.jpg'],
      contextJson: JSON.stringify({ moduleName: 'Placeholder module' }),
    });
    expect(result).toEqual({
      ok: true,
      value: {
        jobId: 'job-12345678',
        task: 'extract',
        screenshotKeys: [validKey, 'screenshots/capture-0001/2.jpg'],
        context: { moduleName: 'Placeholder module' },
      },
    });
  });

  it('rejects an invalid job id without a job to report to', () => {
    expect(parseAssistArguments({ jobId: '../x', task: 'extract' })).toEqual({
      ok: false,
      jobId: null,
      message: 'Invalid job id.',
    });
  });

  it('rejects keys outside screenshots/ and path traversal', () => {
    for (const key of [
      'assist/job-12345678.json',
      'screenshots/../assist/x.png',
      'screenshots/a/b/c.png',
      'screenshots/capture/1.pdf',
    ]) {
      const result = parseAssistArguments({
        jobId: 'job-12345678',
        task: 'extract',
        screenshotKeys: [key],
      });
      expect(result.ok).toBe(false);
    }
  });

  it('caps the number of images', () => {
    const keys = Array.from(
      { length: MAX_ASSIST_IMAGES + 1 },
      (_, i) => `screenshots/capture-0001/${i}.png`,
    );
    const result = parseAssistArguments({
      jobId: 'job-12345678',
      task: 'extract',
      screenshotKeys: keys,
    });
    expect(result).toMatchObject({ ok: false, jobId: 'job-12345678' });
  });

  it('requires a screenshot for extraction but not for a draft explanation', () => {
    expect(
      parseAssistArguments({ jobId: 'job-12345678', task: 'extract' }).ok,
    ).toBe(false);
    expect(
      parseAssistArguments({
        jobId: 'job-12345678',
        task: 'draftExplanation',
        contextJson: '{"question":{"stem":"Placeholder?"}}',
      }).ok,
    ).toBe(true);
  });

  it('rejects unknown tasks and malformed context', () => {
    expect(
      parseAssistArguments({ jobId: 'job-12345678', task: 'summarise' }).ok,
    ).toBe(false);
    expect(
      parseAssistArguments({
        jobId: 'job-12345678',
        task: 'draftExplanation',
        contextJson: '{not json',
      }).ok,
    ).toBe(false);
  });
});

describe('key and format helpers', () => {
  it('maps extensions to Bedrock image formats', () => {
    expect(imageFormatForKey('screenshots/a/1.PNG')).toBe('png');
    expect(imageFormatForKey('screenshots/a/1.jpg')).toBe('jpeg');
    expect(imageFormatForKey('screenshots/a/1.jpeg')).toBe('jpeg');
    expect(imageFormatForKey('screenshots/a/1.webp')).toBe('webp');
    expect(imageFormatForKey('screenshots/a/1.heic')).toBeNull();
  });

  it('builds result keys under assist/', () => {
    expect(assistResultKey('job-12345678')).toBe('assist/job-12345678.json');
    expect(isValidScreenshotKey(validKey)).toBe(true);
  });

  it('matches the env var Amplify generates for the bucket grant', () => {
    expect(CFA_BUCKET_ENV).toBe('CFA_SCREENSHOTS_BUCKET_NAME');
  });
});

describe('prompts', () => {
  it('asks for exactly three options and KaTeX maths', () => {
    const prompt = systemPromptFor('extract');
    expect(prompt).toContain('exactly three options');
    expect(prompt).toContain('$...$');
    expect(prompt).toContain('Markdown table');
  });

  it('splits lettered parts and repeats the shared scenario in each stem', () => {
    const prompt = systemPromptFor('extract');
    expect(prompt).toContain('"part":string|null');
    expect(prompt).toContain('return every part as a separate question');
    expect(prompt).toContain("Repeat the full shared scenario and every exhibit");
  });

  it('includes module and reading context in the user prompt', () => {
    const text = buildUserPrompt(
      'extract',
      { moduleName: 'Placeholder module', readingName: 'Placeholder reading' },
      2,
    );
    expect(text).toContain('these 2 screenshots');
    expect(text).toContain('Module: Placeholder module');
    expect(text).toContain('Reading: Placeholder reading');
  });

  it('embeds the question for a draft explanation', () => {
    const text = buildUserPrompt(
      'draftExplanation',
      { question: { stem: 'Placeholder stem?', answer: 'B' } },
      0,
    );
    expect(text).toContain('"answer":"B"');
    expect(text).not.toContain('screenshots are attached');
  });
});

describe('Claude on Bedrock', () => {
  it('defaults to Claude Sonnet 4.6', () => {
    expect(DEFAULT_CFA_MODEL_ID).toBe('eu.anthropic.claude-sonnet-4-6');
  });

  it('accepts Claude model ids and inference profiles only', () => {
    expect(isClaudeModelId('anthropic.claude-haiku-5-5')).toBe(true);
    expect(isClaudeModelId('us.anthropic.claude-haiku-5-5')).toBe(true);
    expect(isClaudeModelId('global.anthropic.claude-haiku-5-5')).toBe(true);
    expect(
      isClaudeModelId(
        'arn:aws:bedrock:us-east-1:111122223333:inference-profile/us.anthropic.claude-haiku-5-5',
      ),
    ).toBe(true);
    expect(isClaudeModelId('us.meta.llama4-maverick-17b-instruct-v1:0')).toBe(false);
  });

  it('builds a Messages body with images before the prompt and no sampling parameters', () => {
    const body = buildMessagesBody({
      system: 'Placeholder system prompt',
      prompt: 'Placeholder user prompt',
      images: [
        { format: 'png', base64: 'cG5n' },
        { format: 'jpeg', base64: 'anBn' },
      ],
    });
    expect(body).toEqual({
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: ASSIST_MAX_TOKENS,
      system: 'Placeholder system prompt',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'cG5n' } },
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'anBn' } },
            { type: 'text', text: 'Placeholder user prompt' },
          ],
        },
      ],
    });
    expect(body).not.toHaveProperty('temperature');
  });

  it('reads text blocks by type and skips thinking blocks', () => {
    expect(
      messagesReplyText({
        stop_reason: 'end_turn',
        content: [
          { type: 'thinking', thinking: '', signature: 'sig' },
          { type: 'text', text: '{"questions":' },
          { type: 'text', text: '[]}' },
        ],
      }),
    ).toBe('{"questions":[]}');
  });

  it('turns a refusal, a cut-off reply or an empty reply into an error', () => {
    expect(() => messagesReplyText({ stop_reason: 'refusal', content: [] })).toThrow(
      /declined/,
    );
    expect(() =>
      messagesReplyText({ stop_reason: 'max_tokens', content: [{ type: 'text', text: '{' }] }),
    ).toThrow(/cut off/);
    expect(() => messagesReplyText({ stop_reason: 'end_turn', content: [] })).toThrow();
    expect(() => messagesReplyText(null)).toThrow();
  });
});

describe('coerceJsonObject', () => {
  it('strips code fences', () => {
    expect(coerceJsonObject('```json\n{"questions":[]}\n```')).toBe(
      '{"questions":[]}',
    );
  });

  it('trims surrounding prose', () => {
    expect(coerceJsonObject('Here you go: {"a":1} Thanks')).toBe('{"a":1}');
  });

  it('throws when there is no object', () => {
    expect(() => coerceJsonObject('no json here')).toThrow();
    expect(() => coerceJsonObject('[1,2]')).toThrow();
  });
});
