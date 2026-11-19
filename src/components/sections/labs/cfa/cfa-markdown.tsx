'use client';

import { useMemo } from 'react';
import { processMarkdown } from '@/lib/blog-markdown';
import { cn } from '@/lib/utils';

export type CfaMarkdownProps = {
  markdown: string;
  className?: string;
  /** Render inline (e.g. inside an option button) without block spacing. */
  inline?: boolean;
};

/**
 * Question text, options and explanations through the site's remark-math /
 * rehype-katex pipeline. Raw HTML in the Markdown is dropped by remark-rehype.
 */
export function CfaMarkdown({ markdown, className, inline = false }: CfaMarkdownProps) {
  const html = useMemo(() => {
    try {
      return processMarkdown(markdown);
    } catch {
      return null;
    }
  }, [markdown]);

  if (html === null) {
    return <p className={cn('whitespace-pre-wrap font-body', className)}>{markdown}</p>;
  }

  return (
    <div
      className={cn('cfa-content', inline && 'cfa-content-inline', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
