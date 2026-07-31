"use client";

import { useSyncExternalStore } from "react";
import { Button } from "./button";

const THEME_CHANGE_EVENT = "hashadar-theme-change";

function resolveIsDark(): boolean {
  const theme = localStorage.getItem("theme");
  const systemPrefersDark = window.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches;
  return theme === "dark" || (!theme && systemPrefersDark);
}

function applyTheme(isDark: boolean) {
  if (isDark) {
    document.documentElement.classList.add("dark");
    localStorage.setItem("theme", "dark");
  } else {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", "light");
  }
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
  };
}

export function ThemeToggle() {
  // SSR snapshot is always light; client snapshot reads storage after hydrate.
  const isDark = useSyncExternalStore(subscribe, resolveIsDark, () => false);

  const toggleTheme = () => {
    applyTheme(!isDark);
  };

  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <Button
      variant="ghost"
      onClick={toggleTheme}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
    >
      <span aria-hidden="true">{isDark ? "☀" : "☾"}</span>
      <span className="ml-2">{isDark ? "Light" : "Dark"}</span>
    </Button>
  );
}
