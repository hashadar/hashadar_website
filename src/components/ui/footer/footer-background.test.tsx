import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FooterBackground } from '@/components/ui/footer/footer-background';

describe('FooterBackground', () => {
  it('renders a static, reduced-motion-safe atmosphere', () => {
    const { container } = render(<FooterBackground />);
    const root = container.firstElementChild;

    expect(root).toHaveAttribute('aria-hidden', 'true');
    expect(root?.querySelector('.geometric-pattern')).toBeTruthy();
  });
});
