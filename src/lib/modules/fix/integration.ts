/**
 * Fix Integration Contract
 *
 * Defines the type boundary between the AIGA platform and the Fix module.
 * Platform-side only — do not modify the standalone Fix app based on this file.
 *
 * Future flow:
 *   1. Platform calls buildFixUrl(FixLaunchContext) → navigates to Fix
 *   2. Fix completes a diagnostic session
 *   3. Fix redirects to returnTo or calls a future /api/fix/callback
 *   4. Platform receives FixReturnContext, updates issue, logs ActivityEvent
 */

export type { FixSource, FixLaunchContext } from "./launch";

// ── Return / writeback contract (future) ──────────────────────────────────────

export type FixResolution =
  | "resolved"
  | "deferred"
  | "escalated"
  | "needs_parts";

export interface FixReturnContext {
  issueId?:            string;
  assetId?:            string;
  source:              string;
  returnTo:            string;
  resolution?:         FixResolution;
  diagnosticSessionId?: string;
  notes?:              string;
}

/**
 * Future writeback entry points (not yet implemented):
 *
 *   Option A — redirect with query params:
 *     returnTo + ?fixResolution=resolved&diagnosticSessionId=abc123
 *
 *   Option B — POST callback:
 *     /api/fix/callback  ←  receives FixReturnContext as JSON body
 *
 * The platform handles writeback by:
 *   - Updating the linked Issue status
 *   - Creating an ActivityEvent with module: "fix"
 *   - Showing a confirmation toast or inline resolution state
 */
