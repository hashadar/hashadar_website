import { describe, expect, it } from 'vitest';
import { processMarkdown } from './blog-markdown';

describe('processMarkdown', () => {
  it('turns a markdown heading into an HTML heading', () => {
    const html = processMarkdown('# Hello');
    expect(html).toContain('Hello');
    expect(html).toMatch(/<h1\b/);
  });

  it('renders GFM strong emphasis', () => {
    const html = processMarkdown('Hello **world**');
    expect(html).toContain('<strong>world</strong>');
  });
});
