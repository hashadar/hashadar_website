import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeKatex from 'rehype-katex';
import { toHtml } from 'hast-util-to-html';
import type { Root } from 'hast';

/** Markdown string to HTML (same pipeline as blog posts; no filesystem). */
export function processMarkdown(content: string): string {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeKatex);

  const mdTree = processor.parse(content);
  const hastTree = processor.runSync(mdTree) as Root;
  return toHtml(hastTree);
}
