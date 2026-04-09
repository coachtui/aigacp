/**
 * Centralized source context configuration for module entry points.
 *
 * Used by Fix (and future modules like Inspect, CRU) to render source-aware
 * context banners and return CTAs when launched from another platform surface.
 *
 * To add a new source: add an entry here. The module page handles the rest.
 */

export interface SourceEntry {
  /** Short label used in chips and tags */
  label: string;
  /** Human-readable subtitle shown in the banner header */
  subtitle: string;
}

export const SOURCE_CONFIG: Record<string, SourceEntry> = {
  "issue-detail": {
    label:    "Issue Detail",
    subtitle: "Opened from Issue Detail",
  },
  "project-cc": {
    label:    "Project Command Center",
    subtitle: "Opened from Project Command Center",
  },
  "alert-detail": {
    label:    "Alert Detail",
    subtitle: "Opened from Alert Detail",
  },
};

export const FALLBACK_SOURCE: SourceEntry = {
  label:    "External context",
  subtitle: "Opened with diagnostic context",
};

/** Returns the config for a given source string, falling back gracefully. */
export function getSourceConfig(source: string | null): SourceEntry | null {
  if (!source) return null;
  return SOURCE_CONFIG[source] ?? FALLBACK_SOURCE;
}
