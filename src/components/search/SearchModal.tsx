"use client";

import React, { useEffect, useRef } from "react";
import { Search, X, FileText, Building2, Wrench, Users } from "lucide-react";
import { useUI } from "@/providers/UIProvider";

const MOCK_RESULTS = [
  { id: "1", type: "project",   label: "Highland Tower — Phase 2",    sub: "Active · Dallas, TX",      icon: <Building2 size={14} className="text-gold" /> },
  { id: "2", type: "project",   label: "Oakridge Industrial Complex",  sub: "Active · Houston, TX",     icon: <Building2 size={14} className="text-gold" /> },
  { id: "3", type: "equipment", label: "Cat 330 Excavator #EQ-014",   sub: "Maintenance · Fix module",  icon: <Wrench    size={14} className="text-teal" /> },
  { id: "4", type: "crew",      label: "Structural Crew T-3",          sub: "14 members · On site",     icon: <Users     size={14} className="text-content-secondary" /> },
  { id: "5", type: "report",    label: "INS-084 Structural Steel",     sub: "Inspection · Inspect module", icon: <FileText size={14} className="text-blue-brand" /> },
];

export function SearchModal() {
  const { isSearchOpen, closeSearch } = useUI();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = React.useState("");

  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    if (!isSearchOpen) setQuery("");
  }, [isSearchOpen]);

  const results = query.length > 0
    ? MOCK_RESULTS.filter((r) => r.label.toLowerCase().includes(query.toLowerCase()))
    : MOCK_RESULTS;

  if (!isSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] px-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeSearch} />

      {/* Modal */}
      <div className="relative w-full max-w-xl rounded-[var(--radius-card)] bg-surface-raised border border-surface-border shadow-[var(--shadow-dropdown)] overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-border">
          <Search size={16} className="text-content-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, assets, crews, reports…"
            className="flex-1 bg-transparent text-sm text-content-primary placeholder:text-content-muted outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-content-muted hover:text-content-primary transition-colors">
              <X size={14} />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center text-[10px] text-content-muted bg-surface-overlay border border-surface-border px-1.5 py-0.5 rounded font-mono">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <ul className="py-1 max-h-72 overflow-y-auto">
          {results.length === 0 ? (
            <li className="px-4 py-6 text-sm text-content-muted text-center">No results for &ldquo;{query}&rdquo;</li>
          ) : (
            results.map((result) => (
              <li key={result.id}>
                <button
                  onClick={closeSearch}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-overlay text-left transition-colors"
                >
                  <span className="shrink-0 w-6 h-6 flex items-center justify-center rounded bg-surface-overlay border border-surface-border">
                    {result.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-content-primary truncate">{result.label}</p>
                    <p className="text-xs text-content-muted truncate">{result.sub}</p>
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>

        {/* Footer */}
        <div className="border-t border-surface-border px-4 py-2 flex items-center gap-4">
          <span className="text-[11px] text-content-muted">Search is in preview — full index coming soon</span>
        </div>
      </div>
    </div>
  );
}
