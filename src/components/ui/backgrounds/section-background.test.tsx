import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SectionBackground } from '@/components/ui/backgrounds/section-background';

describe('SectionBackground', () => {
  it('renders a quiet grid and gradient rail for marketing', () => {
    const { container } = render(<SectionBackground variant="marketing" />);
    const root = container.firstElementChild;

    expect(root).toHaveAttribute('aria-hidden', 'true');
    expect(root?.querySelector('.geometric-pattern')).toBeTruthy();
    expect(root?.querySelectorAll('.bg-gradient-to-r').length).toBeGreaterThan(0);
  });

  it('keeps photography minimal so imagery leads', () => {
    const { container } = render(<SectionBackground variant="photography" />);
    const root = container.firstElementChild;

    expect(root).toHaveAttribute('aria-hidden', 'true');
    expect(root?.querySelector('.geometric-pattern')).toBeNull();
  });

  it('renders nothing for none', () => {
    const { container } = render(<SectionBackground variant="none" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('defaults to the marketing atmosphere', () => {
    const { container } = render(<SectionBackground />);

    expect(container.firstElementChild?.querySelector('.geometric-pattern')).toBeTruthy();
  });
});
