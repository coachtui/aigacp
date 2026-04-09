"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

interface UIContextValue {
  isAssistantOpen:  boolean;
  isSearchOpen:     boolean;
  sidebarCollapsed: boolean;
  openAssistant:    () => void;
  closeAssistant:   () => void;
  toggleAssistant:  () => void;
  openSearch:       () => void;
  closeSearch:      () => void;
  toggleSidebar:    () => void;
}

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [isAssistantOpen,  setAssistantOpen]  = useState(false);
  const [isSearchOpen,     setSearchOpen]      = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  /* Global keyboard shortcut: cmd+k → search */
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setAssistantOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  const openAssistant  = useCallback(() => setAssistantOpen(true),  []);
  const closeAssistant = useCallback(() => setAssistantOpen(false), []);
  const toggleAssistant = useCallback(() => setAssistantOpen((p) => !p), []);
  const openSearch     = useCallback(() => setSearchOpen(true),     []);
  const closeSearch    = useCallback(() => setSearchOpen(false),    []);
  const toggleSidebar  = useCallback(() => setSidebarCollapsed((p) => !p), []);

  return (
    <UIContext.Provider
      value={{
        isAssistantOpen,
        isSearchOpen,
        sidebarCollapsed,
        openAssistant,
        closeAssistant,
        toggleAssistant,
        openSearch,
        closeSearch,
        toggleSidebar,
      }}
    >
      {children}
    </UIContext.Provider>
  );
}

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used within UIProvider");
  return ctx;
}
