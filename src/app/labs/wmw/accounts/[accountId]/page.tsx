import type { Metadata } from 'next';
import { WmwAccountDetail } from '@/components/sections/labs/wmw/wmw-account-detail';
import { getPageData, site } from '@/data';

const page = getPageData('/labs/wmw');

export const metadata: Metadata = {
  title: `${page.accountDetail.heading} - ${site.metadata.author}`,
  description: page.accountDetail.description,
  robots: {
    index: false,
    follow: false,
  },
};

export default async function WmwAccountDetailPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  return <WmwAccountDetail accountId={accountId} />;
}
