import { describe, expect, it } from 'vitest';
import {
  assertValidAboutPage,
  assertValidBlogPage,
  assertValidCareerProfile,
  assertValidFooter,
  assertValidHomePage,
  assertValidJobMarketLabPage,
  assertValidLabsPage,
  assertValidNavigation,
  assertValidPortfolioPage,
  assertValidSite,
  validateDataFile,
} from '@/data/validate';
import homeData from '@/data/pages/home.json';
import aboutData from '@/data/pages/about.json';
import blogData from '@/data/pages/blog.json';
import portfolioData from '@/data/pages/portfolio.json';
import labsData from '@/data/pages/labs.json';
import jobMarketLabData from '@/data/pages/job-market-lab.json';
import footerData from '@/data/common/footer.json';
import navigationData from '@/data/common/navigation.json';
import siteData from '@/data/common/site.json';
import careerProfileData from '@/data/profile/career-profile.json';

describe('validateDataFile', () => {
  it('accepts golden home page JSON', () => {
    expect(() =>
      validateDataFile('pages/home.json', homeData, assertValidHomePage),
    ).not.toThrow();
  });

  it('rejects malformed home page JSON with the file identifier', () => {
    expect(() =>
      validateDataFile('pages/home.json', { about: {} }, assertValidHomePage),
    ).toThrow(/pages\/home\.json/);
  });

  it('accepts all golden content JSON files', () => {
    expect(() =>
      validateDataFile('pages/about.json', aboutData, assertValidAboutPage),
    ).not.toThrow();
    expect(() =>
      validateDataFile('pages/blog.json', blogData, assertValidBlogPage),
    ).not.toThrow();
    expect(() =>
      validateDataFile('pages/portfolio.json', portfolioData, assertValidPortfolioPage),
    ).not.toThrow();
    expect(() =>
      validateDataFile('pages/labs.json', labsData, assertValidLabsPage),
    ).not.toThrow();
    expect(() =>
      validateDataFile(
        'pages/job-market-lab.json',
        jobMarketLabData,
        assertValidJobMarketLabPage,
      ),
    ).not.toThrow();
    expect(() =>
      validateDataFile('common/footer.json', footerData, assertValidFooter),
    ).not.toThrow();
    expect(() =>
      validateDataFile('common/navigation.json', navigationData, assertValidNavigation),
    ).not.toThrow();
    expect(() =>
      validateDataFile('common/site.json', siteData, assertValidSite),
    ).not.toThrow();
    expect(() =>
      validateDataFile(
        'profile/career-profile.json',
        careerProfileData,
        assertValidCareerProfile,
      ),
    ).not.toThrow();
  });
});
