"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { useOrg } from "@/providers/OrgProvider";

export function ProjectSelector() {
  const { currentProject, availableProjects, setCurrentProject } = useOrg();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-badge)] bg-surface-overlay border border-surface-border hover:border-surface-border-hover transition-colors text-sm font-medium text-content-secondary hover:text-content-primary max-w-[200px]"
      >
        <span className="truncate">{currentProject.name}</span>
        <ChevronDown size={12} className={`shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-64 rounded-[var(--radius-card)] bg-surface-overlay border border-surface-border shadow-[var(--shadow-dropdown)] z-50 overflow-hidden">
          <div className="p-1">
            {availableProjects.map((project) => {
              const isSelected = project.id === currentProject.id;
              return (
                <button
                  key={project.id}
                  onClick={() => { setCurrentProject(project); setOpen(false); }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isSelected
                      ? "bg-gold/10 text-gold"
                      : "text-content-secondary hover:text-content-primary hover:bg-surface-raised"
                  }`}
                >
                  <span className="truncate text-left font-medium">{project.name}</span>
                  {isSelected && <Check size={13} className="shrink-0" />}
                </button>
              );
            })}
          </div>
          <div className="border-t border-surface-border px-3 py-2">
            <p className="text-[11px] text-content-muted">Switch active project</p>
          </div>
        </div>
      )}
    </div>
  );
}
