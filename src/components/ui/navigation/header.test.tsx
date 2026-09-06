import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { navigation, site } from "@/data";
import { Header } from "@/components/ui/navigation/header";

const nav = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
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

afterEach(() => {
  cleanup();
  nav.pathname = "/";
  Object.defineProperty(window, "IntersectionObserver", {
    writable: true,
    value: class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  });
});

describe("Header", () => {
  it("does not repeat the name while the Home Claim is in view", () => {
    nav.pathname = "/";
    render(
      <>
        <Header />
        <section id="claim">
          <h1>hasha dar</h1>
        </section>
      </>,
    );

    const header = screen.getByRole("banner");
    expect(within(header).queryByRole("link", { name: site.brandName })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "hasha dar" })).toBeInTheDocument();
    expect(header.querySelector("nav")).not.toHaveClass("container");
  });

  it("keeps the wordmark on interior pages as the Home door", () => {
    nav.pathname = "/about";
    render(<Header />);

    const header = screen.getByRole("banner");
    expect(within(header).getByRole("link", { name: site.brandName })).toHaveAttribute("href", "/");
    for (const link of navigation.links) {
      expect(within(header).getByRole("link", { name: link.label })).toHaveAttribute("href", link.href);
    }
  });

  it("returns the wordmark once the Claim is out of view", () => {
    nav.pathname = "/";
    Object.defineProperty(window, "IntersectionObserver", {
      writable: true,
      value: class {
        callback: IntersectionObserverCallback;
        constructor(callback: IntersectionObserverCallback) {
          this.callback = callback;
        }
        observe() {
          this.callback(
            [{ isIntersecting: false } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          );
        }
        unobserve() {}
        disconnect() {}
      },
    });

    render(
      <>
        <Header />
        <section id="claim">
          <h1>hasha dar</h1>
        </section>
      </>,
    );

    const header = screen.getByRole("banner");
    expect(within(header).getByRole("link", { name: site.brandName })).toHaveAttribute("href", "/");
  });
});
