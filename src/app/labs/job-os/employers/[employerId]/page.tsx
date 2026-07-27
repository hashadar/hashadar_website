import { JobOsEmployersWorkspace } from '@/components/sections/labs/job-os/job-os-employers-workspace';

export default async function JobOsEmployerDetailPage({
  params,
}: {
  params: Promise<{ employerId: string }>;
}) {
  const { employerId } = await params;
  return <JobOsEmployersWorkspace selectedId={employerId} />;
}
