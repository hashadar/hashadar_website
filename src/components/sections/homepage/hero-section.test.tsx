import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HeroSection } from "@/components/sections/homepage/hero-section";

vi.mock("next/image", () => ({
  default: (props: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt} src={props.src} data-testid="hero-media-image" />
  ),
}));

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
  it("keeps brand typography in the DOM with media atmosphere", () => {
    mockMatchMedia(false);
    render(
      <HeroSection
        name="Hasha Dar"
        title="Software Engineer"
        media={{
          src: "https://example.com/hero.webp",
          alt: "Travel portrait",
          title: "Teaser",
        }}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Hasha Dar" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Software Engineer" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("hero-media-image")).toBeInTheDocument();
  });

  it("shows CSS fallback when media is missing", () => {
    mockMatchMedia(false);
    const { container } = render(
      <HeroSection name="Hasha Dar" title="Software Engineer" media={null} />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Hasha Dar" })).toBeInTheDocument();
    expect(screen.queryByTestId("hero-media-image")).not.toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
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
