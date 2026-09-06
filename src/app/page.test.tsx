import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { home } from "@/data";
import Home from "@/app/page";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("next/image", () => ({
  default: (props: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt} src={props.src} />
  ),
}));

vi.mock("next/link", () => ({
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

function mockInView(isIntersecting: boolean) {
  Object.defineProperty(window, "IntersectionObserver", {
    writable: true,
    value: class {
      callback: IntersectionObserverCallback;
      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
      }
      observe() {
        this.callback(
          [{ isIntersecting } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        );
      }
      unobserve() {}
      disconnect() {}
    },
  });
}

const pageSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "page.tsx"),
  "utf8",
);

afterEach(() => {
  cleanup();
  mockMatchMedia(false);
  mockInView(false);
});

describe("Home page", () => {
  it("is Claim, Statement, and Proof only — no catalogue sections or Home experience slice", () => {
    expect(pageSource).toContain("HeroSection");
    expect(pageSource).toContain("StatementSection");
    expect(pageSource).toContain("ProofSection");
    expect(pageSource).not.toContain("getHomePhotographyTeaser");
    expect(pageSource).not.toContain("getHomeExperienceView");
    expect(pageSource).not.toContain("ExperienceListing");
    expect(pageSource).not.toContain("PhotographySection");
    expect(pageSource).not.toContain("BlogSection");
    expect(pageSource).not.toContain("ProseSection");
  });

  it("renders four Proof doors and Statement copy, and omits old Home sections", () => {
    mockMatchMedia(false);
    mockInView(true);

    render(<Home />);

    expect(screen.getByRole("img", { name: "hasha dar" })).toHaveAttribute(
      "src",
      "/img/statement-portrait.webp",
    );

    expect(screen.getByRole("link", { name: "consultant" })).toHaveAttribute("href", "/about");
    expect(screen.getByRole("link", { name: "photographer" })).toHaveAttribute(
      "href",
      "/portfolio",
    );
    expect(screen.getByRole("link", { name: "software developer" })).toHaveAttribute(
      "href",
      "/labs",
    );
    expect(screen.getByRole("link", { name: "writer" })).toHaveAttribute("href", "/blog");

    const photographer = screen.getByRole("link", { name: "photographer" });
    expect(photographer.querySelector("img")).toHaveAttribute(
      "src",
      "/loops/photography-poster.webp",
    );
    expect(photographer.querySelector("[data-loop]")).toHaveAttribute(
      "data-loop-tone",
      "photograph",
    );

    expect(screen.queryByRole("heading", { name: "Experience" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Photography" })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
