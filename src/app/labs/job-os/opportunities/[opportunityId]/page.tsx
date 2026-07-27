import { JobOsOpportunitiesWorkspace } from '@/components/sections/labs/job-os/job-os-opportunities-workspace';

export default async function JobOsOpportunityDetailPage({
  params,
}: {
  params: Promise<{ opportunityId: string }>;
}) {
  const { opportunityId } = await params;
  return <JobOsOpportunitiesWorkspace selectedId={opportunityId} />;
}
