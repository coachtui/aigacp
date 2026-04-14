/**
 * OrgAssetRegistry — Phase 1: reads MOCK_ASSETS, enriches with MX readiness.
 * Phase 3: assets are created here; MX and Fix sync from AIGACP.
 *
 * All module code that needs equipment data should import from here,
 * not from @/lib/mock/assets directly.
 */

import { MOCK_ASSETS } from "@/lib/mock/assets";
import type { Asset } from "@/types/domain";
import type { ReadinessStatus } from "@/lib/mx/types";

export interface OrgAsset extends Asset {
  orgId:              string;
  readiness?:         ReadinessStatus;
  lastDiagnostic?:    string;   // ISO datetime of last Fix diagnostic session
  activeWorkOrderId?: string;   // MX work order currently open for this asset
}

/** Returns all assets for an org, optionally filtered to a project. */
export function getOrgAssets(orgId: string, projectId?: string): OrgAsset[] {
  const base = projectId
    ? MOCK_ASSETS.filter((a) => a.project_id === projectId)
    : MOCK_ASSETS;
  return base.map((a) => ({ ...a, orgId }));
}

/** Returns a single asset by ID, or null if not found. */
export function getAssetById(id: string, orgId: string): OrgAsset | null {
  const asset = MOCK_ASSETS.find((a) => a.id === id) ?? null;
  if (!asset) return null;
  return { ...asset, orgId };
}
