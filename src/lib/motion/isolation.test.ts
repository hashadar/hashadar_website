import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

const webglImport = /hero-webgl|@react-three|from ['"]three['"]/;

function readSrc(pathFromRepo: string) {
  return readFileSync(join(repoRoot, pathFromRepo), "utf8");
}

function walkSource(dirFromRepo: string): string[] {
  const abs = join(repoRoot, dirFromRepo);
  return readdirSync(abs).flatMap((entry) => {
    const next = join(dirFromRepo, entry);
    const absNext = join(repoRoot, next);
    if (statSync(absNext).isDirectory()) {
      return walkSource(next);
    }
    if (next.endsWith(".test.ts") || next.endsWith(".test.tsx")) {
      return [];
    }
    if (next.endsWith(".tsx") || next.endsWith(".ts")) {
      return [next.split("\\").join("/")];
    }
    return [];
  });
}

describe("motion isolation", () => {
  it("does not mount or import WebGL anywhere in the app", () => {
    expect(existsSync(join(repoRoot, "src/components/ui/hero-webgl"))).toBe(false);
    expect(
      existsSync(join(repoRoot, "src/components/ui/backgrounds/hero-background.tsx")),
    ).toBe(false);

    const files = [
      ...walkSource("src/app"),
      ...walkSource("src/components"),
      ...walkSource("src/lib"),
    ];

    for (const file of files) {
      expect(readSrc(file), file).not.toMatch(webglImport);
    }
  });

  it("exports the shipped public motion primitives from the UI barrel", () => {
    const barrel = readSrc("src/components/ui/index.ts");

    expect(barrel).toContain("MotionRevealGroup");
    expect(barrel).toContain("export { HeroMedia, HeroFallback }");
    expect(barrel).toContain("export { SectionBackground }");
    expect(barrel).toContain("FooterBackground");
    expect(barrel).not.toContain("HeroWebGL");
    expect(barrel).not.toContain("hero-webgl");
  });

  it("imports the Claim Loop from the UI barrel", () => {
    const source = readSrc("src/components/sections/homepage/hero-section.tsx");

    expect(source).toContain("Loop");
    expect(source).not.toContain("@/components/ui/loop/");
    expect(source).not.toContain("HeroMedia");
    expect(source).not.toContain("HeroFallback");
  });

  it("keeps Labs, Admin, and Login free of marketing spectacle primitives", () => {
    const files = [
      ...walkSource("src/components/sections/labs"),
      ...walkSource("src/app/labs"),
      ...walkSource("src/app/admin"),
      ...walkSource("src/app/login"),
    ];

    for (const file of files) {
      const source = readSrc(file);
      expect(source, file).not.toContain("SectionBackground");
      expect(source, file).not.toContain("HeroMedia");
      expect(source, file).not.toContain("HeroFallback");
      expect(source, file).not.toContain("MotionRevealGroup");
    }

    expect(readSrc("src/components/sections/labs/job-os/job-os-shell.tsx")).toContain(
      "animated={false}",
    );
  });
});
