import { SitePage } from '@/components/layout/site-page';
import { JobOsShell } from '@/components/sections/labs/job-os/job-os-shell';

export default function JobOsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SitePage mainClassName="min-h-screen pt-20">
      <JobOsShell>{children}</JobOsShell>
    </SitePage>
  );
}
