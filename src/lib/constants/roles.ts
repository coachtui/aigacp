import type { UserRole } from "@/types/org";

export const ROLE_LABELS: Record<UserRole, string> = {
  owner:   "Owner",
  admin:   "Admin",
  pm:      "Project Manager",
  foreman: "Foreman",
  viewer:  "Viewer",
};

export const ROLE_BADGE_COLORS: Record<UserRole, string> = {
  owner:   "text-gold border-gold/30 bg-[var(--gold-subtle)]",
  admin:   "text-blue-brand border-blue-brand/30 bg-[var(--blue-brand-subtle)]",
  pm:      "text-teal border-teal/30 bg-[var(--teal-subtle)]",
  foreman: "text-content-secondary border-surface-border bg-surface-overlay",
  viewer:  "text-content-muted border-surface-border bg-surface-overlay",
};
