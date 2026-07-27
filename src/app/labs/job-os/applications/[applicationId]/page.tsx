import { JobOsApplicationsWorkspace } from '@/components/sections/labs/job-os/job-os-applications-workspace';

export default async function JobOsApplicationDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  return <JobOsApplicationsWorkspace selectedId={applicationId} />;
}
