import { SitePage } from '@/components/layout/site-page';
import { JobMarketConsoleShell } from '@/components/sections/labs/console/job-market-console-shell';

export default function JobMarketLabConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SitePage mainClassName="min-h-screen pt-20">
      <JobMarketConsoleShell>{children}</JobMarketConsoleShell>
    </SitePage>
  );
}
