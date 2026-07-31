"use client";

import { useServerInsertedHTML } from "next/navigation";

const THEME_INIT_SCRIPT = `(function() {
  try {
    const theme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (theme === 'dark' || (!theme && systemPrefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();`;

/**
 * Injects the FOUC-prevention theme script via useServerInsertedHTML so React 19
 * does not warn about a <script> rendered inside a component on the client.
 */
export function ThemeScript() {
  useServerInsertedHTML(() => (
    <script
      dangerouslySetInnerHTML={{
        __html: THEME_INIT_SCRIPT,
      }}
    />
  ));

  return null;
}
