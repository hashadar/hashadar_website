import { describe, expect, it } from 'vitest';
import {
  assertValidAboutPage,
  assertValidAdminPage,
  assertValidBlogPage,
  assertValidCareerProfile,
  assertValidFooter,
  assertValidHomePage,
  assertValidLabsPage,
  assertValidJobOsPage,
  assertValidLoginPage,
  assertValidNavigation,
  assertValidPortfolioPage,
  assertValidSite,
  assertValidWmwPage,
  validateDataFile,
} from '@/data/validate';
import homeData from '@/data/pages/home.json';
import aboutData from '@/data/pages/about.json';
import blogData from '@/data/pages/blog.json';
import portfolioData from '@/data/pages/portfolio.json';
import labsData from '@/data/pages/labs.json';
import jobOsData from '@/data/pages/job-os.json';
import wmwData from '@/data/pages/wmw.json';
import loginData from '@/data/pages/login.json';
import adminData from '@/data/pages/admin.json';
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

  it('rejects a catalogue Home shape', () => {
    expect(() =>
      validateDataFile(
        'pages/home.json',
        { ...homeData, about: { heading: 'About', content: 'x' } },
        assertValidHomePage,
      ),
    ).toThrow(/catalogue block "about"/);
  });

  it('rejects a Proof door without a still', () => {
    const invalid = structuredClone(homeData) as {
      proof: { doors: Array<{ media: string; src?: string }> };
    };
    const door = invalid.proof.doors.find((entry) => entry.media === 'photo');
    delete door?.src;

    expect(() =>
      validateDataFile('pages/home.json', invalid, assertValidHomePage),
    ).toThrow(/src/);
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
      validateDataFile('pages/job-os.json', jobOsData, assertValidJobOsPage),
    ).not.toThrow();
    expect(() =>
      validateDataFile('pages/wmw.json', wmwData, assertValidWmwPage),
    ).not.toThrow();
    expect(() =>
      validateDataFile('pages/login.json', loginData, assertValidLoginPage),
    ).not.toThrow();
    expect(() =>
      validateDataFile('pages/admin.json', adminData, assertValidAdminPage),
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
