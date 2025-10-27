"use client";

export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="skip-to-content absolute left-4 top-4 z-[100] -translate-y-32 rounded-md bg-[var(--primary)] px-4 py-2 text-white font-medium focus:translate-y-0 transition-transform duration-200"
    >
      Skip to main content
    </a>
  );
}

