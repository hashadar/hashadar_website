"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";
import { NavLink, Text } from "@/components/ui";
import { getCommonData } from "@/data";

function fitWordmarkToDoors(mark: HTMLElement, nav: HTMLElement) {
  mark.style.fontSize = "";
  const links = [...nav.querySelectorAll("a")];
  if (links.length === 0) return;

  const first = links[0].getBoundingClientRect();
  const last = links[links.length - 1].getBoundingClientRect();
  const target = last.right - first.left;
  const range = document.createRange();
  range.selectNodeContents(mark);
  const natural =
    typeof range.getBoundingClientRect === "function"
      ? range.getBoundingClientRect().width
      : mark.scrollWidth;
  const current = parseFloat(getComputedStyle(mark).fontSize);
  if (target <= 0 || natural <= 0 || current <= 0) return;

  mark.style.fontSize = `${(current * target) / natural}px`;
}

export function FooterSection() {
  const { footer, navigation, site } = getCommonData();
  const { email, social, copyright, admin } = footer.contact;
  const markRef = useRef<HTMLParagraphElement>(null);
  const navRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const mark = markRef.current;
    const nav = navRef.current;
    if (!mark || !nav) return;

    const fit = () => fitWordmarkToDoors(mark, nav);
    fit();
    void document.fonts?.ready.then(fit);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(fit);
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--background)]">
      <div className="w-full px-6">
        <div className="grid gap-6 py-12 md:grid-cols-[1fr_auto] md:items-end">
          <div className="w-max">
            <p
              ref={markRef}
              className="w-fit whitespace-nowrap font-body text-sm leading-none tracking-tight text-[var(--foreground)]"
            >
              {site.brandName}
            </p>
            <nav ref={navRef} className="mt-3 flex gap-x-5" aria-label="Footer">
              {navigation.links.map((link) => (
                <NavLink key={link.href} href={link.href}>
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--mono-500)]">
            <a href={`mailto:${email}`} className="hover:text-[var(--primary)] transition-colors">
              {email}
            </a>
            <a
              href={social.github}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--primary)] transition-colors"
            >
              GitHub
            </a>
            <a
              href={social.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--primary)] transition-colors"
            >
              LinkedIn
            </a>
            <Text as="span" size="xs" variant="muted">
              {copyright}
            </Text>
            <Link
              href={admin.href}
              className="text-xs text-[var(--foreground)] opacity-45 transition-opacity hover:opacity-70"
            >
              {admin.label}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
