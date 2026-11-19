import type { Metadata } from 'next';
import { cfa, site } from '@/data';

/** Private Lab metadata: titled from cfa.json and never indexed (like WMW and Job OS). */
export function cfaMetadata(heading?: string): Metadata {
  return {
    title: `${heading ? `${heading} · ` : ''}${cfa.heading} - ${site.metadata.author}`,
    description: cfa.description,
    robots: {
      index: false,
      follow: false,
    },
  };
}
