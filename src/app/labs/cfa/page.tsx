import { CfaOverview } from '@/components/sections/labs/cfa/cfa-overview';
import { cfaMetadata } from '@/lib/cfa/metadata';

export const metadata = cfaMetadata();

export default function CfaPage() {
  return <CfaOverview />;
}
