import type { ModuleId, BundleId, ModuleScope, UserRole } from "@/types/org";

/** Context passed to embed-mode modules via URL params */
export interface ModuleContext {
  orgId:     string;
  projectId: string;
  role:      UserRole;
  issueId?:  string;
  assetId?:  string;
  source?:   string;
}

/**
 * How data flows into the module.
 * - api:    AIGACP calls the module's backend (e.g. CRU via /api/cru/ops)
 * - embed:  module app is embedded via URL (e.g. EquipIQ/Fix)
 * - native: module is fully built inside AIGACP (e.g. MX, OPS)
 */
export type ModuleDataAdapter =
  | { type: "api";    fetch: (orgId: string, projectId: string) => Promise<unknown> } // typed per-module in Phase 3
  | { type: "embed";  buildUrl: (ctx: ModuleContext) => string }
  | { type: "native"; route: string }

/** Callbacks a module can use to notify the shell */
export interface ModuleEmitter {
  onIssueCreated?:   (issueId: string) => void;
  onActivityLogged?: (eventId: string) => void;
}

/** Per-role scope mapping for a module */
export type RoleManifest = Partial<Record<UserRole, ModuleScope>>;

/** The full plug-in contract every module satisfies */
export interface ModuleContract {
  id:           ModuleId;
  adapter:      ModuleDataAdapter;
  roleManifest: RoleManifest;
  emitter?:     ModuleEmitter;
  bundleIds:    BundleId[];
}
