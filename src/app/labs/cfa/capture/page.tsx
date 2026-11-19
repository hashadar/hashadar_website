import { CfaCapture } from '@/components/sections/labs/cfa/cfa-capture';
import { cfa } from '@/data';
import { cfaMetadata } from '@/lib/cfa/metadata';

export const metadata = cfaMetadata(cfa.capture.heading);

export default function CfaCapturePage() {
  return <CfaCapture />;
}
