import 'katex/dist/katex.min.css';
import '@/styles/cfa-content.css';
import { SitePage } from '@/components/layout/site-page';
import { CfaShell } from '@/components/sections/labs/cfa/cfa-shell';

export default function CfaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SitePage mainClassName="min-h-screen pt-20">
      <CfaShell>{children}</CfaShell>
    </SitePage>
  );
}
