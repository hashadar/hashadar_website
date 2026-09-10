import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('dead motion CSS cleanup', () => {
  it('removes unused hero float and pulse loops from globals.css', () => {
    const css = readFileSync(join(repoRoot, 'src/app/globals.css'), 'utf8');

    expect(css).not.toContain('hero-floating');
    expect(css).not.toContain('hero-pulse');
    expect(css).not.toMatch(/@keyframes\s+float\b/);
    expect(css).not.toMatch(/@keyframes\s+pulse-glow\b/);
  });

  it('removes unused perspective and parallax utilities from tailwind.config.ts', () => {
    const config = readFileSync(join(repoRoot, 'tailwind.config.ts'), 'utf8');

    expect(config).not.toContain('perspective-1000');
    expect(config).not.toContain('transform-style-preserve-3d');
    expect(config).not.toContain('hero-parallax');
  });
});
