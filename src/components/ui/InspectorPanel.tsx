"use client";

/**
 * InspectorPanel — right-side detail drawer.
 *
 * Slides over the current workspace without a full-page navigation.
 * Used by WoInspectorPanel (MX) and PourInspectorPanel (OPS).
 *
 * Usage:
 *   <InspectorPanel open={!!selectedId} onClose={() => setSelectedId(null)} title="...">
 *     ...body content...
 *   </InspectorPanel>
 */

import { useEffect } from "react";
import { X } from "lucide-react";

interface InspectorPanelProps {
  open:      boolean;
  onClose:   () => void;
  /** Primary heading shown in the panel header */
  title:     string;
  /** Small label above the title (e.g. "Work Order · WO-0042") */
  subtitle?: string;
  /** Status badge or any small element shown beside the title */
  badge?:    React.ReactNode;
  children:  React.ReactNode;
}

export function InspectorPanel({
  open,
  onClose,
  title,
  subtitle,
  badge,
  children,
}: InspectorPanelProps) {
  // Escape key to close
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-stretch justify-end"
      role="dialog"
      aria-modal
      aria-label={title}
    >
      {/* Backdrop — click to close */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel — full height, fixed width */}
      <div className="relative z-10 h-full w-full max-w-[500px] bg-surface-raised border-l border-surface-border shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-surface-border flex-shrink-0">
          <div className="min-w-0 flex-1">
            {subtitle && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-1">
                {subtitle}
              </p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-content-primary leading-snug">{title}</h2>
              {badge}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1.5 rounded hover:bg-surface-overlay text-content-muted hover:text-content-primary transition-colors mt-0.5"
            aria-label="Close panel"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

      </div>
    </div>
  );
}
