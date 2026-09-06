import { cleanup, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { ThemeToggle } from '@/components/ui/theme-toggle';

function mockMatchMedia(prefersDark: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query.includes('prefers-color-scheme: dark')
        ? prefersDark
        : false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});

describe('ThemeToggle', () => {
  it('SSR markup always uses the light-mode label (hydration-safe)', () => {
    const html = renderToString(<ThemeToggle />);

    expect(html).toContain('Switch to dark mode');
    expect(html).not.toContain('Switch to light mode');
  });

  it('syncs to stored dark theme after mount', async () => {
    localStorage.setItem('theme', 'dark');
    mockMatchMedia(false);

    render(<ThemeToggle />);

    expect(
      await screen.findByRole('button', { name: 'Switch to light mode' }),
    ).toBeInTheDocument();
  });

  it('uses a sun or moon icon rather than a Light or Dark word', () => {
    render(<ThemeToggle />);

    const button = screen.getByRole('button', { name: 'Switch to dark mode' });
    expect(button.querySelector('svg')).toBeTruthy();
    expect(button).not.toHaveTextContent(/light|dark/i);
  });
});
