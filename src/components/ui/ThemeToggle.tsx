"use client";

/**
 * ThemeToggle — sun / moon button for the Topbar.
 *
 * Dark mode  → shows Sun  (click to switch to light)
 * Light mode → shows Moon (click to switch to dark)
 */

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/providers/ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex items-center justify-center w-8 h-8 rounded-[var(--radius-badge)] border border-surface-border bg-surface-overlay hover:border-surface-border-hover hover:text-content-primary text-content-muted transition-colors"
    >
      {isDark
        ? <Sun  size={14} className="text-content-muted" />
        : <Moon size={14} className="text-content-muted" />
      }
    </button>
  );
}
