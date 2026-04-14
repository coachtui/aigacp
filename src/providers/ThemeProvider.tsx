"use client";

/**
 * ThemeProvider — dark / light mode context.
 *
 * Persists the user's preference in localStorage under "aiga-theme".
 * Applies / removes the `light` class on <html>.
 *
 * All color tokens are CSS custom properties defined in globals.css.
 * The html.light selector overrides them — Tailwind utility classes
 * that reference these vars update automatically, no JSX changes needed.
 */

import { createContext, useContext, useEffect, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type Theme = "dark" | "light";

interface ThemeContextValue {
  theme:       Theme;
  toggleTheme: () => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeContextValue>({
  theme:       "dark",
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  // On mount: read saved preference and apply it
  useEffect(() => {
    const saved = localStorage.getItem("aiga-theme") as Theme | null;
    const initial = saved === "light" ? "light" : "dark";
    setTheme(initial);
    applyClass(initial);
  }, []);

  function applyClass(t: Theme) {
    const html = document.documentElement;
    if (t === "light") {
      html.classList.add("light");
    } else {
      html.classList.remove("light");
    }
  }

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyClass(next);
    localStorage.setItem("aiga-theme", next);
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
