import { CfaQuestionDetail } from '@/components/sections/labs/cfa/cfa-question-detail';
import { cfa } from '@/data';
import { cfaMetadata } from '@/lib/cfa/metadata';

export const metadata = cfaMetadata(cfa.questionDetail.heading);

export default async function CfaQuestionDetailPage({
  params,
}: {
  params: Promise<{ questionId: string }>;
}) {
  const { questionId } = await params;
  return <CfaQuestionDetail key={questionId} questionId={questionId} />;
}
