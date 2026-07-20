import type { Metadata } from 'next';
import { JobMarketConsoleCorpusPage } from '@/components/sections/labs/console/job-market-console-corpus-page';
import { getPageData, site } from '@/data';

const jobMarketLab = getPageData('/labs/job-market');
const navItem = jobMarketLab.console.nav.items.find((item) => item.id === 'corpus');

export const metadata: Metadata = {
  title: `${navItem?.label ?? 'Corpus'} - ${jobMarketLab.console.heading} - ${site.metadata.author}`,
  description: navItem?.description ?? jobMarketLab.console.description,
  robots: {
    index: false,
    follow: false,
  },
};

export default function JobMarketLabConsoleCorpusRoute() {
  return <JobMarketConsoleCorpusPage />;
}
