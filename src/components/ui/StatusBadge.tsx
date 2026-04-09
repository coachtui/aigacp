import React from "react";

interface StatusBadgeProps {
  status:  string;
  size?:   "sm" | "md";
}

const STATUS_MAP: Record<string, string> = {
  /* Project status */
  active:      "bg-status-success/15 text-status-success border-status-success/25",
  on_hold:     "bg-status-warning/15  text-status-warning  border-status-warning/25",
  completed:   "bg-surface-overlay    text-content-secondary border-surface-border",
  planning:    "bg-blue-brand/10       text-blue-brand        border-blue-brand/25",

  /* Issue severity */
  critical:    "bg-status-critical/15 text-status-critical border-status-critical/25",
  high:        "bg-status-warning/15  text-status-warning  border-status-warning/25",
  medium:      "bg-blue-brand/10       text-blue-brand       border-blue-brand/25",
  low:         "bg-surface-overlay    text-content-secondary border-surface-border",

  /* Issue / generic status */
  open:        "bg-status-critical/10 text-status-critical border-status-critical/20",
  in_progress: "bg-status-warning/10  text-status-warning  border-status-warning/20",
  resolved:    "bg-status-success/10  text-status-success  border-status-success/20",

  /* Asset status */
  maintenance: "bg-status-warning/15 text-status-warning border-status-warning/25",
  offline:     "bg-status-critical/15 text-status-critical border-status-critical/25",

  /* Crew status */
  on_site:     "bg-status-success/15 text-status-success border-status-success/25",
  off_site:    "bg-surface-overlay text-content-secondary border-surface-border",
};

const LABEL_MAP: Record<string, string> = {
  active:      "Active",
  on_hold:     "On Hold",
  completed:   "Completed",
  planning:    "Planning",
  critical:    "Critical",
  high:        "High",
  medium:      "Medium",
  low:         "Low",
  open:        "Open",
  in_progress: "In Progress",
  resolved:    "Resolved",
  maintenance: "Maintenance",
  offline:     "Offline",
  on_site:     "On Site",
  off_site:    "Off Site",
};

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const classes = STATUS_MAP[status] ?? "bg-surface-overlay text-content-muted border-surface-border";
  const label   = LABEL_MAP[status] ?? status;
  const sizeClass = size === "sm"
    ? "text-[11px] font-semibold tracking-wide px-1.5 py-0.5"
    : "text-xs font-semibold tracking-wide px-2 py-1";

  return (
    <span className={`inline-flex items-center border rounded-[var(--radius-badge)] uppercase ${sizeClass} ${classes}`}>
      {label}
    </span>
  );
}
