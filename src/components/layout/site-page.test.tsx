import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { footer, navigation, site } from '@/data';
import { SitePage } from '@/components/layout/site-page';

afterEach(() => {
  cleanup();
});

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('SitePage', () => {
  it('owns the skip link, header, main landmark, and footer', () => {
    render(
      <SitePage>
        <p>Page body</p>
      </SitePage>,
    );

    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute(
      'href',
      '#main-content',
    );

    const main = document.getElementById('main-content');
    expect(main).toBeInTheDocument();
    expect(main?.tagName).toBe('MAIN');
    expect(screen.getByText('Page body')).toBeInTheDocument();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('keeps Home and Admin out of the header; public doors come from data', () => {
    render(
      <SitePage>
        <p>Page body</p>
      </SitePage>,
    );

    const header = screen.getByRole('banner');
    expect(within(header).queryByRole('link', { name: 'Home' })).not.toBeInTheDocument();
    expect(within(header).queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
    expect(within(header).queryByRole('link', { name: site.brandName })).not.toBeInTheDocument();

    for (const link of navigation.links) {
      expect(within(header).getByRole('link', { name: link.label })).toHaveAttribute(
        'href',
        link.href,
      );
    }
  });

  it('renders a quiet footer with public doors and Admin last', () => {
    render(
      <SitePage>
        <p>Page body</p>
      </SitePage>,
    );

    const siteFooter = screen.getByRole('contentinfo');
    expect(screen.queryByText('Get in Touch')).not.toBeInTheDocument();
    expect(screen.queryByText('Navigation')).not.toBeInTheDocument();
    expect(screen.queryByText('Connect')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Turning zeros and ones into insights, pixels into stories, and moments into memories'),
    ).not.toBeInTheDocument();
    expect(within(siteFooter).queryByRole('link', { name: /sign out/i })).not.toBeInTheDocument();

    for (const link of navigation.links) {
      expect(within(siteFooter).getByRole('link', { name: link.label })).toHaveAttribute(
        'href',
        link.href,
      );
    }

    expect(screen.getByRole('link', { name: footer.contact.email })).toHaveAttribute(
      'href',
      `mailto:${footer.contact.email}`,
    );
    expect(within(siteFooter).getByRole('link', { name: 'GitHub' })).toHaveAttribute(
      'href',
      footer.contact.social.github,
    );
    expect(within(siteFooter).getByRole('link', { name: 'LinkedIn' })).toHaveAttribute(
      'href',
      footer.contact.social.linkedin,
    );
    expect(within(siteFooter).getByText(footer.contact.copyright)).toBeInTheDocument();

    const footerLinks = within(siteFooter).getAllByRole('link');
    const adminLink = footerLinks[footerLinks.length - 1];
    expect(adminLink).toHaveAttribute('href', footer.contact.admin.href);
    expect(adminLink).toHaveTextContent(footer.contact.admin.label);
    expect(siteFooter.querySelector('.container')).toBeNull();
  });

  it('applies optional mainClassName to the main landmark', () => {
    const { container } = render(
      <SitePage mainClassName="min-h-screen pt-20">
        <p>Spaced body</p>
      </SitePage>,
    );

    expect(container.querySelector('#main-content')).toHaveClass(
      'bg-[var(--background)]',
      'min-h-screen',
      'pt-20',
    );
  });
});
