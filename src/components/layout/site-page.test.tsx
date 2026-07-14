import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { footer, navigation } from '@/data';
import { SitePage } from '@/components/layout/site-page';

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
  it('renders the main landmark with children and a self-loaded footer', () => {
    render(
      <SitePage>
        <p>Page body</p>
      </SitePage>,
    );

    const main = document.getElementById('main-content');
    expect(main).toBeInTheDocument();
    expect(main?.tagName).toBe('MAIN');
    expect(screen.getByText('Page body')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: footer.contact.email })).toHaveAttribute(
      'href',
      `mailto:${footer.contact.email}`,
    );

    const siteFooter = screen.getByRole('contentinfo');
    expect(
      within(siteFooter).getByRole('link', { name: navigation.links[0].label }),
    ).toHaveAttribute('href', navigation.links[0].href);
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
