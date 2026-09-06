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
  it('describes Home as Claim, Statement, and Proof with doors in data', () => {
    expect(home).not.toHaveProperty('hero');
    expect(home).not.toHaveProperty('about');
    expect(home).not.toHaveProperty('photography');
    expect(home).not.toHaveProperty('blog');
    expect(home.claim.lockup).toEqual(['hasha', 'dar']);
    expect(home.claim.roles.map((role) => role.question)).toEqual([
      'consultant?',
      'photographer?',
      'software developer?',
      'writer?',
    ]);
    expect(home.claim.landingLine).toBe('all of the above.');
    expect(home.claim.loopSrc).toBe('/loops/claim-poster.webp');
    expect(home.statement.headline).toBe('Hello.');
    expect(home.statement.lines).toEqual([
      'I am an AI & Data consultant at Deloitte.',
      'Find out more about me.',
    ]);
    expect(home.statement.cta).toEqual({ label: 'About', href: '/about' });
    expect(home.statement.continue).toEqual({ label: 'See more', href: '#proof' });
    expect(home.statement.portrait).toEqual({
      src: '/img/statement-portrait.webp',
      alt: 'hasha dar',
    });
    expect(home.proof.doors.map((door) => ({ id: door.id, href: door.href, media: door.media, src: door.src }))).toEqual([
      { id: 'consultant', href: '/about', media: 'loop', src: '/loops/consultant-poster.webp' },
      { id: 'photographer', href: '/portfolio', media: 'photo', src: '/loops/photography-poster.webp' },
      { id: 'developer', href: '/labs', media: 'loop', src: '/loops/developer-poster.webp' },
      { id: 'writer', href: '/blog', media: 'loop', src: '/loops/writer-poster.webp' },
    ]);
    expect(home.proof.doors.find((door) => door.id === 'developer')?.href).toBe('/labs');
  });

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

  it('returns WMW page data for the authenticated product route', () => {
    expect(getPageData('/labs/wmw')?.heading).toBe("What's My Worth");
  });
});

describe('getCommonData', () => {
  it('returns footer, navigation, and site together', () => {
    expect(getCommonData()).toEqual({ footer, navigation, site });
  });

  it('includes a Labs navigation link to the Labs index', () => {
    expect(navigation.links).toContainEqual({ label: 'Labs', href: '/labs' });
  });

  it('keeps header doors to public pages only, with Admin as a footer-only link', () => {
    expect(navigation.links).toEqual([
      { label: 'About', href: '/about' },
      { label: 'Portfolio', href: '/portfolio' },
      { label: 'Labs', href: '/labs' },
      { label: 'Blog', href: '/blog' },
    ]);
    expect(navigation.links).not.toContainEqual({ label: 'Home', href: '/' });
    expect(navigation.links).not.toContainEqual({ label: 'Admin', href: '/admin' });
    expect(footer.contact.admin).toEqual({ label: 'Admin', href: '/admin' });
    expect(footer.contact).not.toHaveProperty('ownerSignIn');
    expect(footer.contact).not.toHaveProperty('heading');
    expect(footer.contact).not.toHaveProperty('description');
    expect(footer.contact).not.toHaveProperty('navigationTitle');
    expect(footer.contact).not.toHaveProperty('socialTitle');
  });
});
