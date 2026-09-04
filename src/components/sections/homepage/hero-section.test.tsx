import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/dynamic", () => ({
  default: () => {
    function MockHeroWebGL() {
      return <div data-testid="hero-webgl-stub" aria-hidden="true" />;
    }
    return MockHeroWebGL;
  },
}));

vi.mock("@/components/ui/hero-webgl/hero-webgl", () => ({
  HeroWebGL: () => <div data-testid="hero-webgl-stub" aria-hidden="true" />,
}));

import { HeroSection } from "@/components/sections/homepage/hero-section";

function mockMatchMedia(matchesReduced: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: query.includes("prefers-reduced-motion") ? matchesReduced : false,
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
  mockMatchMedia(false);
});

describe("HeroSection", () => {
  it("keeps brand typography in the DOM", () => {
    mockMatchMedia(false);
    render(<HeroSection name="Hasha Dar" title="Software Engineer" />);

    expect(screen.getByRole("heading", { level: 1, name: "Hasha Dar" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Software Engineer" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("hero-webgl-stub")).toBeInTheDocument();
  });

  it("still shows brand text when reduced motion is preferred", () => {
    mockMatchMedia(true);
    render(<HeroSection name="Hasha Dar" title="Software Engineer" />);

    expect(screen.getByRole("heading", { level: 1, name: "Hasha Dar" })).toBeVisible();
    expect(
      screen.getByRole("heading", { level: 2, name: "Software Engineer" }),
    ).toBeVisible();
  });
});
