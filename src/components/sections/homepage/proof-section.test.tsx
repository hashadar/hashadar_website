import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { home } from "@/data";
import { ProofSection } from "@/components/sections/homepage/proof-section";

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

afterEach(() => {
  cleanup();
  mockMatchMedia(false);
  mockInView(false);
});

describe("ProofSection", () => {
  it("renders four Role-word doors to About, Portfolio, Labs index, and Blog", () => {
    mockMatchMedia(false);
    mockInView(true);

    render(<ProofSection proof={home.proof} />);

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

    expect(screen.queryByRole("link", { name: /blog/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /photography/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /job os/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /what's my worth/i })).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "software developer" }).getAttribute("href"),
    ).not.toMatch(/\/labs\//);

    expect(screen.getByRole("link", { name: "consultant" }).querySelector(".proof-label")).toHaveTextContent(
      "consultant",
    );
  });

  it("places a Loop-treated photography poster on the photographer door, with no lightbox", () => {
    mockMatchMedia(false);
    mockInView(true);

    render(<ProofSection proof={home.proof} />);

    const photographer = screen.getByRole("link", { name: "photographer" });
    expect(photographer.querySelector("img")).toHaveAttribute(
      "src",
      "/loops/photography-poster.webp",
    );
    expect(photographer.querySelector("[data-loop]")).toHaveAttribute("data-loop", "live");
    expect(photographer.querySelector("[data-loop]")).toHaveAttribute(
      "data-loop-tone",
      "photograph",
    );
    expect(photographer.querySelector(".loop-grain-motion")).toBeTruthy();
    expect(photographer.querySelector(".loop-plate-motion")).toBeTruthy();
    expect(within(photographer).queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /close/i })).not.toBeInTheDocument();
  });

  it("runs analog Loop motion on all four tiles when in view", () => {
    mockMatchMedia(false);
    mockInView(true);

    const { container } = render(<ProofSection proof={home.proof} />);

    expect(container.querySelectorAll("[data-loop='live']")).toHaveLength(4);
    expect(container.querySelector("video")).toBeNull();
    expect(container.querySelector("[controls]")).toBeNull();
    expect(container.querySelector("img[src='/loops/consultant-poster.webp']")).toBeTruthy();
    expect(container.querySelector("img[src='/loops/photography-poster.webp']")).toBeTruthy();
    expect(container.querySelector("img[src='/loops/developer-poster.webp']")).toBeTruthy();
    expect(container.querySelector("img[src='/loops/writer-poster.webp']")).toBeTruthy();
  });

  it("freezes Proof Loops when reduced motion is preferred", () => {
    mockMatchMedia(true);
    mockInView(true);

    const { container } = render(<ProofSection proof={home.proof} />);

    expect(container.querySelectorAll("[data-loop='frozen']")).toHaveLength(4);
    expect(container.querySelector(".loop-grain-motion")).toBeNull();
    expect(container.querySelector(".loop-plate-motion")).toBeNull();
  });
});
