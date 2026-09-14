import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { InteriorHeading, PageIntro } from "@/components/sections/shared/page-intro";

function mockPrefersReducedMotion(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: query.includes("prefers-reduced-motion") ? matches : false,
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
  mockPrefersReducedMotion(false);
});

describe("PageIntro", () => {
  it("renders a large first-fold heading and lede without ornaments", () => {
    const { container } = render(
      <PageIntro heading="Photography" lede="Selected stills." />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Photography" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Selected stills.")).toBeInTheDocument();
    expect(container.querySelector(".geometric-pattern")).toBeNull();
    expect(container.innerHTML).not.toContain("skew");
  });

  it("stays visible when reduced motion is preferred", () => {
    mockPrefersReducedMotion(true);
    render(<PageIntro heading="Blog" lede="Writing." />);

    expect(screen.getByRole("heading", { name: "Blog" })).toBeVisible();
    expect(screen.getByText("Writing.")).toBeVisible();
  });
});

describe("InteriorHeading", () => {
  it("renders a quiet section heading", () => {
    render(<InteriorHeading>experience</InteriorHeading>);

    expect(
      screen.getByRole("heading", { level: 2, name: "experience" }),
    ).toBeInTheDocument();
  });
});
