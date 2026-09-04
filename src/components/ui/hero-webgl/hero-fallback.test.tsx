import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HeroFallback } from "@/components/ui/hero-webgl/hero-fallback";

describe("HeroFallback", () => {
  it("renders an intentional static atmosphere", () => {
    const { container } = render(<HeroFallback />);
    const root = container.firstElementChild;

    expect(root).toBeTruthy();
    expect(root).toHaveAttribute("aria-hidden", "true");
    expect(root?.querySelectorAll("div").length).toBeGreaterThan(3);
  });
});
