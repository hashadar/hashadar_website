import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { home } from "@/data";
import { HeroSection } from "@/components/sections/homepage/hero-section";

vi.mock("next/image", () => ({
  default: (props: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt} src={props.src} />
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
  vi.useRealTimers();
});

describe("HeroSection", () => {
  it("renders the name as a two-line lockup, not a job title headline", () => {
    mockMatchMedia(false);

    render(<HeroSection claim={home.claim} />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("hasha");
    expect(heading).toHaveTextContent("dar");
    expect(heading.querySelectorAll("span")).toHaveLength(2);
    expect(
      screen.queryByRole("heading", { name: /AI & Data Consultant|Software Engineer/i }),
    ).not.toBeInTheDocument();
  });

  it("places the Claim Loop behind the lockup and falls back when the still is missing", () => {
    mockMatchMedia(false);

    const { container, rerender } = render(<HeroSection claim={home.claim} />);

    const loop = container.querySelector("[data-loop]");
    expect(loop).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("img")).toHaveAttribute("src", home.claim.loopSrc);

    rerender(<HeroSection claim={{ ...home.claim, loopSrc: "" }} />);
    expect(container.querySelector("[data-loop]")).toHaveAttribute("data-loop", "fallback");
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(container.querySelector(".loop-fallback")).toBeTruthy();
  });

  it("shows the name and four Roles statically when reduced motion is preferred", () => {
    mockMatchMedia(true);

    render(<HeroSection claim={home.claim} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("hasha");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("dar");

    const staticLine = screen.getByText(
      "consultant? photographer? software developer? writer?",
    );
    expect(staticLine).toHaveTextContent("consultant?");
    expect(staticLine).toHaveTextContent("photographer?");
    expect(staticLine).toHaveTextContent("software developer?");
    expect(staticLine).toHaveTextContent("writer?");
    expect(staticLine).not.toHaveTextContent("all of the above.");
    expect(staticLine).not.toHaveAttribute("aria-hidden", "true");
  });

  it("keeps Roles as static text, not a live region", () => {
    mockMatchMedia(false);

    const { container } = render(<HeroSection claim={home.claim} />);

    expect(container.querySelector("[aria-live]")).toBeNull();
    const forAssistiveTech = screen.getByText(
      "consultant? photographer? software developer? writer?",
    );
    expect(forAssistiveTech).not.toHaveAttribute("aria-hidden", "true");
    expect(forAssistiveTech).not.toHaveAttribute("aria-live");
  });

  it("loops Roles through the four questions and never lands on the closing line", () => {
    mockMatchMedia(false);
    vi.useFakeTimers();

    const { container } = render(<HeroSection claim={home.claim} />);
    const ticker = [...container.querySelectorAll("p")].find(
      (node) => node.getAttribute("aria-hidden") === "true",
    );

    expect(ticker).toHaveTextContent("consultant?");

    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(ticker).toHaveTextContent("photographer?");

    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(ticker).toHaveTextContent("software developer?");

    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(ticker).toHaveTextContent("writer?");

    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(ticker).toHaveTextContent("consultant?");
    expect(ticker).not.toHaveTextContent("all of the above.");

    act(() => {
      vi.advanceTimersByTime(1100);
    });
    expect(ticker).toHaveTextContent("photographer?");
  });

  it("keeps the lockup unclipped on a landscape reduced-motion Claim", () => {
    mockMatchMedia(true);

    const { container } = render(<HeroSection claim={home.claim} />);
    const heading = screen.getByRole("heading", { level: 1 });
    const lockup = container.querySelector("[data-claim-lockup]");

    expect(lockup).toHaveClass("overflow-visible");
    expect(heading).toHaveClass("overflow-visible");
    for (const line of heading.querySelectorAll("span")) {
      expect(line).toHaveClass("whitespace-nowrap");
      expect(line.className).not.toMatch(/\bw-full\b/);
    }
  });
});
