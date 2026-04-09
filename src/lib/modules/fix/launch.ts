// ── Source identifiers ────────────────────────────────────────────────────────
// Stable names used across the platform. Do not rename — these appear in logs.
export type FixSource =
  | "dashboard"
  | "issue-detail"
  | "issues-list"
  | "project-command-center"
  | "project-assets"
  | "alerts-list"
  | "alert-detail";

// ── Launch context payload ─────────────────────────────────────────────────────
// Only include params that are actually present — callers should omit undefined fields.
export interface FixLaunchContext {
  source:       FixSource;
  issueId?:     string;
  assetId?:     string;
  alertId?:     string;
  projectId?:   string;
  orgId?:       string;
  role?:        string;
  sourceLabel?: string;
  // returnTo: the platform URL Fix should navigate back to after completing a session.
  // Always include when possible so Fix can return the user to the right place.
  returnTo?: string;
}

// ── Mode config ────────────────────────────────────────────────────────────────
// NEXT_PUBLIC_FIX_MODE=integrated (default) | standalone
// NEXT_PUBLIC_FIX_BASE_URL=https://fix.aiga.app (only used in standalone mode)
const FIX_MODE     = process.env.NEXT_PUBLIC_FIX_MODE     ?? "integrated";
const FIX_BASE_URL = process.env.NEXT_PUBLIC_FIX_BASE_URL ?? "https://fix.aiga.app";

export function isStandaloneMode(): boolean {
  return FIX_MODE === "standalone";
}

// ── Core URL builder ───────────────────────────────────────────────────────────
// Single source of truth for constructing a Fix launch URL from anywhere in the platform.
// Works in server components, client components, and utilities.
export function buildFixUrl(ctx: FixLaunchContext): string {
  const base   = FIX_MODE === "standalone" ? FIX_BASE_URL : "/modules/fix";
  const params = new URLSearchParams();

  if (ctx.issueId)     params.set("issueId",     ctx.issueId);
  if (ctx.assetId)     params.set("assetId",     ctx.assetId);
  if (ctx.alertId)     params.set("alertId",     ctx.alertId);
  if (ctx.projectId)   params.set("projectId",   ctx.projectId);
  if (ctx.orgId)       params.set("orgId",       ctx.orgId);
  if (ctx.role)        params.set("role",        ctx.role);
  if (ctx.sourceLabel) params.set("sourceLabel", ctx.sourceLabel);
  params.set("source", ctx.source);
  if (ctx.returnTo)    params.set("returnTo",    ctx.returnTo);

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}
