"use client";

import { useOrg } from "@/providers/OrgProvider";
import type { ModuleId, ModuleScope } from "@/types/org";
import { getModuleScope, isModuleVisibleToRole } from "@/lib/modules/role-manifest";

/**
 * Role-aware module access hook.
 *
 * Combines two independent gates:
 *  1. Bundle gate: is this module in the org's purchased bundles? (isModuleEnabled)
 *  2. Role gate: does the current role have any access to this module?
 *
 * A module from an unpurchased bundle is shown locked (isModuleEnabled = false).
 * A module the role can't access at all is hidden completely (isRoleHidden = true).
 */
export function useModuleAccess() {
  const { role, isModuleEnabled } = useOrg();

  /** True when the role has no access — module should not appear in launchpad or nav. */
  function isRoleHidden(moduleId: ModuleId): boolean {
    return !isModuleVisibleToRole(moduleId, role);
  }

  /** The scope the current role has inside this module. */
  function getScope(moduleId: ModuleId): ModuleScope {
    return getModuleScope(moduleId, role);
  }

  return { isModuleEnabled, isRoleHidden, getScope };
}
