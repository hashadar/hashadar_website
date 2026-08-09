import { SitePage } from '@/components/layout/site-page';
import { WmwShell } from '@/components/sections/labs/wmw/wmw-shell';

export default function WmwLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SitePage mainClassName="min-h-screen pt-20">
      <WmwShell>{children}</WmwShell>
    </SitePage>
  );
}
