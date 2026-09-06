import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Loop } from "@/components/ui/loop/loop";

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

describe("Loop", () => {
  it("freezes analog motion when reduced motion is preferred", () => {
    mockMatchMedia(true);
    mockInView(true);

    const { container } = render(
      <div className="relative h-40">
        <Loop src="/loops/claim-poster.webp" />
      </div>,
    );

    const root = container.querySelector("[data-loop]");
    expect(root).toHaveAttribute("data-loop", "frozen");
    expect(root).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector(".loop-grain-motion")).toBeNull();
    expect(container.querySelector(".loop-plate-motion")).toBeNull();
    expect(container.querySelector(".loop-flash-motion")).toBeNull();
    expect(container.querySelector("canvas")).toBeNull();
    expect(container.querySelector("img")).toHaveAttribute("src", "/loops/claim-poster.webp");
  });

  it("uses an intentional CSS fallback when the still is missing", () => {
    mockMatchMedia(false);
    mockInView(true);

    const { container } = render(
      <div className="relative h-40">
        <Loop src={null} />
      </div>,
    );

    const root = container.querySelector("[data-loop]");
    expect(root).toHaveAttribute("data-loop", "fallback");
    expect(root).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".loop-fallback")).toBeTruthy();
    expect(container.querySelector(".loop-grain-motion")).toBeNull();
    expect(container.querySelector("canvas")).toBeNull();
  });

  it("applies analog motion only when the still is in view", () => {
    mockMatchMedia(false);
    mockInView(true);

    const { container } = render(
      <div className="relative h-40">
        <Loop src="/loops/writer-poster.webp" />
      </div>,
    );

    expect(container.querySelector("[data-loop]")).toHaveAttribute("data-loop", "live");
    expect(container.querySelector(".loop-grain-motion")).toBeTruthy();
    expect(container.querySelector(".loop-plate-motion")).toBeTruthy();
    expect(container.querySelector(".loop-flash-motion")).toBeTruthy();
    expect(container.querySelector(".loop-light-motion")).toBeTruthy();

    cleanup();
    mockInView(false);

    const frozen = render(
      <div className="relative h-40">
        <Loop src="/loops/writer-poster.webp" />
      </div>,
    );

    expect(frozen.container.querySelector("[data-loop]")).toHaveAttribute("data-loop", "frozen");
    expect(frozen.container.querySelector(".loop-grain-motion")).toBeNull();
    expect(frozen.container.querySelector(".loop-flash-motion")).toBeNull();
  });
});
