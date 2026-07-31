import { describe, expect, it } from 'vitest';
import {
  about,
  admin,
  blog,
  getCommonData,
  getPageData,
  home,
  labs,
  login,
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
    expect(getPageData('/login')).toBe(login);
    expect(getPageData('/admin')).toBe(admin);
  });

  it('returns British English Sign-in copy without registration', () => {
    const page = getPageData('/login');
    expect(page?.heading).toBe('Sign in');
    expect(page?.submitLabel).toBe('Sign in');
    expect(page?.signOutLabel).toBe('Sign out');
    expect(JSON.stringify(page)).not.toMatch(/create account|register|sign up/i);
  });

  it('returns null for unknown routes including the retired job-market lab', () => {
    expect(getPageData('/labs/job-market')).toBeNull();
    expect(getPageData('/finance')).toBeNull();
    expect(getPageData('/missing')).toBeNull();
  });

  it('returns Job OS page data for the authenticated product route', () => {
    expect(getPageData('/labs/job-os')?.heading).toBe('Job OS');
  });
});

describe('getCommonData', () => {
  it('returns footer, navigation, and site together', () => {
    expect(getCommonData()).toEqual({ footer, navigation, site });
  });

  it('includes a Labs navigation link to the Labs index', () => {
    expect(navigation.links).toContainEqual({ label: 'Labs', href: '/labs' });
  });

  it('includes an unobtrusive Admin navigation link and no footer sign-in', () => {
    expect(navigation.links).toContainEqual({ label: 'Admin', href: '/admin' });
    expect(footer.contact).not.toHaveProperty('ownerSignIn');
  });
});
