import { CfaPractice, type PracticeDeck } from '@/components/sections/labs/cfa/cfa-practice';
import { cfa } from '@/data';
import { cfaMetadata } from '@/lib/cfa/metadata';

export const metadata = cfaMetadata(cfa.practice.heading);

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function single(value: string | string[] | undefined): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  return first?.trim() ? first.trim() : null;
}

function toDeck(value: string | null): PracticeDeck | null {
  return value === 'mistakes' || value === 'recent' ? value : null;
}

export default async function CfaPracticePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const deck = toDeck(single(params.deck));
  return (
    <CfaPractice
      key={deck ?? 'builder'}
      deck={deck}
      initialModule={single(params.module)}
      initialReading={single(params.reading)}
      initialLos={single(params.los)}
    />
  );
}
