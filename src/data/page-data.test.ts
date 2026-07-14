import { describe, expect, it } from 'vitest';
import {
  about,
  blog,
  getCommonData,
  getPageData,
  home,
  labs,
  jobMarketLab,
  portfolio,
  footer,
  navigation,
  site,
} from '@/data';

describe('getPageData', () => {
  it('returns the matching page data for every public route', () => {
    expect(getPageData('/')).toBe(home);
    expect(getPageData('/home')).toBe(home);
    expect(getPageData('/about')).toBe(about);
    expect(getPageData('/blog')).toBe(blog);
    expect(getPageData('/portfolio')).toBe(portfolio);
    expect(getPageData('/labs')).toBe(labs);
    expect(getPageData('/labs/job-market')).toBe(jobMarketLab);
  });

  it('returns null for unknown routes', () => {
    expect(getPageData('/finance')).toBeNull();
    expect(getPageData('/missing')).toBeNull();
  });
});

describe('getCommonData', () => {
  it('returns footer, navigation, and site together', () => {
    expect(getCommonData()).toEqual({ footer, navigation, site });
  });

  it('includes a Labs navigation link to the Labs index', () => {
    expect(navigation.links).toContainEqual({ label: 'Labs', href: '/labs' });
  });
});
