"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useOrg } from "@/providers/OrgProvider";
import { getRoleGroup } from "@/lib/utils/roles";
import { ROLE_LABELS } from "@/lib/constants/roles";
import type { UserRole } from "@/types/org";

const ROLES: UserRole[] = [
  "owner",
  "admin",
  "pm",
  "project_engineer",
  "superintendent",
  "foreman",
  "mechanic",
];

const GROUP_LABEL: Record<string, string> = {
  oversight:   "Oversight",
  office:      "Office",
  field:       "Field",
  maintenance: "Maintenance",
};

export function DevRoleSwitcher() {
  const { role, setRole } = useOrg();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 h-7 px-2 rounded border border-orange-500/40 bg-orange-500/8 text-[10px] font-bold tracking-widest hover:bg-orange-500/15 transition-colors"
        title="Dev: switch active role"
      >
        <span className="text-orange-400 uppercase">DEV</span>
        <span className="text-content-secondary hidden sm:inline">{ROLE_LABELS[role]}</span>
        <ChevronDown
          size={10}
          className={`text-content-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 right-0 w-52 bg-surface-base border border-surface-border rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-surface-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted">
              Switch Role
            </p>
            <p className="text-[10px] text-content-muted mt-0.5">Dev only — affects all role logic</p>
          </div>
          <div className="py-1">
            {ROLES.map((r) => {
              const group = getRoleGroup(r);
              const active = r === role;
              return (
                <button
                  key={r}
                  onClick={() => { setRole(r); setOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-surface-overlay ${
                    active ? "text-gold bg-gold/5" : "text-content-primary"
                  }`}
                >
                  <span className="font-medium">{ROLE_LABELS[r]}</span>
                  <span className={`text-[10px] ${active ? "text-gold/60" : "text-content-muted"}`}>
                    {GROUP_LABEL[group]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
