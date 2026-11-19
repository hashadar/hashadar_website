import { CfaBank } from '@/components/sections/labs/cfa/cfa-bank';
import { cfa } from '@/data';
import { cfaMetadata } from '@/lib/cfa/metadata';

export const metadata = cfaMetadata(cfa.bank.heading);

export default async function CfaQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return <CfaBank initialFlaggedOnly={params.flagged === '1'} />;
}
