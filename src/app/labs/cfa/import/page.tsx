import { CfaImport } from '@/components/sections/labs/cfa/cfa-import';
import { cfa } from '@/data';
import { cfaMetadata } from '@/lib/cfa/metadata';

export const metadata = cfaMetadata(cfa.import.heading);

export default function CfaImportPage() {
  return <CfaImport />;
}
