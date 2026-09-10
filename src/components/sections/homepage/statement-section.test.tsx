import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { home } from "@/data";
import { StatementSection } from "@/components/sections/homepage/statement-section";

vi.mock("next/image", () => ({
  default: (props: { alt: string; src: string; className?: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={props.alt} src={props.src} className={props.className} />
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

afterEach(() => {
  cleanup();
});

describe("StatementSection", () => {
  it("renders Statement copy from data with an About door and an uncropped portrait", () => {
    render(<StatementSection statement={home.statement} />);

    expect(screen.getByRole("heading", { name: home.statement.headline })).toBeInTheDocument();
    for (const line of home.statement.lines) {
      expect(screen.getByText(line)).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: home.statement.cta.label })).toHaveAttribute(
      "href",
      home.statement.cta.href,
    );
    expect(screen.getByRole("link", { name: home.statement.continue.label })).toHaveAttribute(
      "href",
      home.statement.continue.href,
    );
    const portrait = screen.getByRole("img", { name: home.statement.portrait.alt });
    expect(portrait).toHaveAttribute("src", home.statement.portrait.src);
    expect(portrait).toHaveClass("grayscale");
    expect(portrait).not.toHaveClass("object-cover");
  });
});
