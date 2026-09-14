import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..');

const webglImport = /hero-webgl|@react-three|from ['"]three['"]/;

function readSrc(pathFromRepo: string) {
  return readFileSync(join(repoRoot, pathFromRepo), 'utf8');
}

function walkTsx(dirFromRepo: string): string[] {
  const abs = join(repoRoot, dirFromRepo);
  return readdirSync(abs).flatMap((entry) => {
    const next = join(dirFromRepo, entry);
    const absNext = join(repoRoot, next);
    if (statSync(absNext).isDirectory()) {
      return walkTsx(next);
    }
    if (next.endsWith('.test.ts') || next.endsWith('.test.tsx')) {
      return [];
    }
    if (next.endsWith('.tsx') || next.endsWith('.ts')) {
      return [next.split('\\').join('/')];
    }
    return [];
  });
}

describe('marketing motion wiring', () => {
  it('staggers portfolio and blog index grids', () => {
    const grids = [
      'src/components/sections/portfolio/portfolio-grid.tsx',
      'src/components/sections/blog/blog-grid.tsx',
    ];

    for (const file of grids) {
      expect(readSrc(file), file).toContain('MotionRevealGroup');
    }
  });

  it('does not wrap interiors in a marketing or photography atmosphere', () => {
    const interiors = [
      'src/components/sections/about/about-hero-section.tsx',
      'src/components/sections/shared/prose-section.tsx',
      'src/components/sections/shared/experience-listing.tsx',
      'src/components/sections/shared/education-listing.tsx',
      'src/components/sections/shared/certifications-listing.tsx',
      'src/components/sections/portfolio/portfolio-grid.tsx',
      'src/components/sections/blog/blog-grid.tsx',
      'src/components/sections/labs/labs-index-section.tsx',
    ];

    for (const file of interiors) {
      const source = readSrc(file);
      expect(source, file).not.toContain('SectionBackground');
      expect(source, file).not.toContain('showRightAccent');
      expect(source, file).not.toContain('showBottomAccent');
      expect(source, file).not.toContain('showLeftAccent');
      expect(source, file).not.toContain('geometric-pattern');
      expect(source, file).not.toMatch(/skew-x-12|skew-y-12/);
      expect(source, file).not.toContain('clip-path');
      expect(source, file).not.toContain('clipPath');
    }
  });

  it('does not import WebGL on any marketing, Labs, or home surface', () => {
    const roots = [
      'src/components/sections',
      'src/app/about',
      'src/app/blog',
      'src/app/portfolio',
      'src/app/labs',
      'src/app/admin',
      'src/app/login',
    ];
    const files = [
      ...roots.flatMap(walkTsx),
      'src/components/sections/footer-section.tsx',
      'src/components/ui/photo-card.tsx',
      'src/components/ui/blog-card.tsx',
      'src/components/ui/lightbox.tsx',
    ];

    for (const file of files) {
      expect(readSrc(file), file).not.toMatch(webglImport);
    }
  });

  it('keeps the blog reading surface free of decorative motion', () => {
    const source = readSrc('src/app/blog/[slug]/page.tsx');
    expect(source).not.toContain('SectionBackground');
    expect(source).not.toContain('{ label: "Home"');
    expect(source).not.toContain("label: 'Home'");
  });

  it('strips left-bar heading accents from blog markdown chrome', () => {
    const css = readSrc('src/styles/blog-content.css');
    expect(css).not.toContain('border-left: 3px solid var(--primary)');
    expect(css).not.toContain('.blog-content h1::before');
  });
});
