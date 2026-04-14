# Platform Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the contract-first module system — bundle packages, role × module gating, org registry, and the Fix field escalation path.

**Architecture:** ModuleContract interface as the plug-in seam; `purchasedBundles` on OrgConfig drives `enabledModules`; `OrgAssetRegistry` and `OrgWorkforceRegistry` decouple modules from direct mock/CRU access; `useShellEmitter` gives modules a typed write path back to shell state.

**Tech Stack:** Next.js 16 (App Router), TypeScript strict, React 19, no test framework — `npx tsc --noEmit` is the verification step throughout.

---

### Task 1: Add BundleId and ModuleScope types

**Files:**
- Modify: `src/types/org.ts`

- [ ] **Step 1: Add the two new types to `src/types/org.ts`**

Open `src/types/org.ts`. Add after the `ModuleId` type:

```ts
export type BundleId = "field_ops" | "equipment" | "operations";

export type ModuleScope = "full" | "read" | "my_work" | "field" | "hidden";
```

Leave everything else in the file untouched.

- [ ] **Step 2: Verify no type errors**

```bash
npx tsc --noEmit
```

Expected: no output (clean).

- [ ] **Step 3: Commit**

```bash
git add src/types/org.ts
git commit -m "feat(types): add BundleId and ModuleScope types"
```

---

### Task 2: Module contract interfaces

**Files:**
- Create: `src/lib/modules/module-contract.ts`

- [ ] **Step 1: Create `src/lib/modules/module-contract.ts`**

```ts
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
  | { type: "api";    fetch: (orgId: string, projectId: string) => Promise<unknown> }
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
  bundleIds:    BundleId[];
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/lib/modules/module-contract.ts
git commit -m "feat(modules): add ModuleContract interface"
```

---

### Task 3: Bundle registry and role manifest

**Files:**
- Create: `src/lib/modules/bundles.ts`
- Create: `src/lib/modules/role-manifest.ts`

- [ ] **Step 1: Create `src/lib/modules/bundles.ts`**

```ts
import type { BundleId, ModuleId } from "@/types/org";

export interface BundleDefinition {
  id:      BundleId;
  label:   string;
  modules: ModuleId[];
}

export const BUNDLE_REGISTRY: BundleDefinition[] = [
  {
    id:      "field_ops",
    label:   "Field Ops",
    modules: ["cru", "datum"],
  },
  {
    id:      "equipment",
    label:   "Equipment",
    modules: ["mx", "fix", "inspect"],
  },
  {
    id:      "operations",
    label:   "Operations",
    modules: ["ops"],
  },
];

/** Returns the unique set of module IDs across all provided bundle IDs. */
export function getModulesForBundles(bundleIds: BundleId[]): ModuleId[] {
  const modules = BUNDLE_REGISTRY
    .filter((b) => bundleIds.includes(b.id))
    .flatMap((b) => b.modules);
  return [...new Set(modules)];
}
```

- [ ] **Step 2: Create `src/lib/modules/role-manifest.ts`**

```ts
import type { ModuleId, ModuleScope, UserRole } from "@/types/org";

export type RoleManifestEntry = Partial<Record<UserRole, ModuleScope>>;

/**
 * Role × module access matrix.
 * Two-axis gating: visibility (hidden = not shown) and scope (what you can do).
 *
 * viewer: read-only shell only — all modules hidden.
 */
export const MODULE_ROLE_MANIFEST: Record<ModuleId, RoleManifestEntry> = {
  cru: {
    owner:            "full",
    admin:            "full",
    pm:               "read",
    project_engineer: "full",
    superintendent:   "read",
    foreman:          "read",
    mechanic:         "hidden",
    viewer:           "hidden",
  },
  datum: {
    owner:            "full",
    admin:            "full",
    pm:               "read",
    project_engineer: "full",
    superintendent:   "full",
    foreman:          "full",
    mechanic:         "hidden",
    viewer:           "hidden",
  },
  mx: {
    owner:            "full",
    admin:            "full",
    pm:               "read",
    project_engineer: "read",
    superintendent:   "read",
    foreman:          "read",
    mechanic:         "my_work",
    viewer:           "hidden",
  },
  fix: {
    owner:            "full",
    admin:            "full",
    pm:               "read",
    project_engineer: "read",
    superintendent:   "field",
    foreman:          "field",
    mechanic:         "my_work",
    viewer:           "hidden",
  },
  inspect: {
    owner:            "full",
    admin:            "full",
    pm:               "full",
    project_engineer: "full",
    superintendent:   "full",
    foreman:          "my_work",
    mechanic:         "my_work",
    viewer:           "hidden",
  },
  ops: {
    owner:            "full",
    admin:            "full",
    pm:               "full",
    project_engineer: "full",
    superintendent:   "read",
    foreman:          "read",
    mechanic:         "hidden",
    viewer:           "hidden",
  },
};

/** Returns the scope a role has for a module. Defaults to "hidden". */
export function getModuleScope(moduleId: ModuleId, role: UserRole): ModuleScope {
  return MODULE_ROLE_MANIFEST[moduleId]?.[role] ?? "hidden";
}

/** Returns true if the role should see this module in the launchpad/nav. */
export function isModuleVisibleToRole(moduleId: ModuleId, role: UserRole): boolean {
  return getModuleScope(moduleId, role) !== "hidden";
}
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/lib/modules/bundles.ts src/lib/modules/role-manifest.ts
git commit -m "feat(modules): add bundle registry and role manifest"
```

---

### Task 4: OrgConfig → purchasedBundles, OrgProvider → derived enabledModules

**Files:**
- Modify: `src/types/org.ts`
- Modify: `src/lib/config/org.ts`
- Modify: `src/providers/OrgProvider.tsx`

- [ ] **Step 1: Update `OrgConfig` in `src/types/org.ts`**

Replace the `enabledModules` field with `purchasedBundles`. Find this block:

```ts
export interface OrgConfig {
  org:            OrgContext;
  currentProject: ProjectContext;
  currentUser:    UserContext;
  enabledModules: ModuleId[];
  features:       Partial<Record<ModuleId, ModuleFeatureMap>>;
}
```

Replace with:

```ts
export interface OrgConfig {
  org:              OrgContext;
  currentProject:   ProjectContext;
  currentUser:      UserContext;
  purchasedBundles: BundleId[];
  features:         Partial<Record<ModuleId, ModuleFeatureMap>>;
}
```

Also add the `BundleId` import at the top — it's already in the same file so no import needed.

- [ ] **Step 2: Update `MOCK_ORG_CONFIG` in `src/lib/config/org.ts`**

Find the `enabledModules` line in `MOCK_ORG_CONFIG`:

```ts
  enabledModules: ["cru", "fix", "inspect", "datum", "ops", "mx"],
```

Replace with:

```ts
  purchasedBundles: ["field_ops", "equipment", "operations"],
```

No import changes needed — `BundleId` is inferred from the OrgConfig type.

- [ ] **Step 3: Update `src/providers/OrgProvider.tsx`**

Add the import for `getModulesForBundles` at the top:

```ts
import { getModulesForBundles } from "@/lib/modules/bundles";
import type { BundleId } from "@/types/org";
```

In the `OrgProvider` function, derive `enabledModules` from `config.purchasedBundles` before the return. Replace the existing `isModuleEnabled` function:

```ts
const enabledModules = getModulesForBundles(config.purchasedBundles);

function isModuleEnabled(id: ModuleId): boolean {
  return enabledModules.includes(id);
}
```

In the context value object, replace the existing `enabledModules` line:

```ts
enabledModules,
```

(It was already there — now it's computed above rather than read from `config.enabledModules`.)

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/types/org.ts src/lib/config/org.ts src/providers/OrgProvider.tsx
git commit -m "feat(entitlements): derive enabledModules from purchasedBundles"
```

---

### Task 5: useModuleAccess hook and ModuleLaunchpad role filtering

**Files:**
- Create: `src/hooks/useModuleAccess.ts`
- Modify: `src/components/dashboard/ModuleLaunchpad.tsx`

- [ ] **Step 1: Create `src/hooks/useModuleAccess.ts`**

```ts
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
```

- [ ] **Step 2: Update `src/components/dashboard/ModuleLaunchpad.tsx`**

Replace the full file contents with:

```tsx
"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ModuleTile } from "@/components/ui/ModuleTile";
import { MODULE_REGISTRY } from "@/lib/modules/module-registry";
import { useModuleAccess } from "@/hooks/useModuleAccess";

export function ModuleLaunchpad() {
  const { isModuleEnabled, isRoleHidden } = useModuleAccess();

  // Modules the current role can never access are not shown at all.
  // Modules from unpurchased bundles are shown locked (isEnabled = false).
  const visibleModules = MODULE_REGISTRY.filter((mod) => {
    const purchased = isModuleEnabled(mod.id);
    // If purchased but role can't see it → hide entirely
    if (purchased && isRoleHidden(mod.id)) return false;
    return true;
  });

  return (
    <Card variant="default" className="!p-0">
      <div className="p-5 pb-3">
        <SectionHeader title="Module Launchpad" subtitle="Quick access to your active tools" />
      </div>
      <div className="px-5 pb-5 grid grid-cols-2 gap-3">
        {visibleModules.map((mod) => (
          <ModuleTile
            key={mod.id}
            module={mod}
            isEnabled={isModuleEnabled(mod.id)}
          />
        ))}
      </div>
    </Card>
  );
}
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 4: Start dev server and check the launchpad**

```bash
npm run dev
```

Open http://localhost:3000/dashboard. Switch to mechanic role using the role switcher. CRU, Datum, and OPS tiles should disappear. MX, Fix, Inspect should remain visible (all in Equipment bundle, mechanic has my_work scope). Switch to owner — all 6 tiles visible.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useModuleAccess.ts src/components/dashboard/ModuleLaunchpad.tsx
git commit -m "feat(launchpad): role-based module visibility via useModuleAccess"
```

---

### Task 6: Org registry — assets and workforce

**Files:**
- Create: `src/lib/registry/assets.ts`
- Create: `src/lib/registry/workforce.ts`
- Create: `src/lib/registry/index.ts`

- [ ] **Step 1: Create `src/lib/registry/assets.ts`**

```ts
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
```

- [ ] **Step 2: Create `src/lib/registry/workforce.ts`**

```ts
/**
 * OrgWorkforceRegistry — Phase 1: thin wrapper over the CRU integration adapter.
 * Phase 3: worker records live in AIGACP; CRU syncs from here.
 *
 * All module code that needs workforce data should import from here,
 * not from @/lib/integrations/cru directly.
 */

import {
  getCruWorkersForOrg,
  getCruWorkersByRole,
  getCruMechanicsAndDrivers,
} from "@/lib/integrations/cru";

export interface OrgWorker {
  id:               string;
  name:             string;
  role:             string;
  orgId:            string;
  projectId?:       string;
  available:        boolean;
  activeAssignment?: string;
  source:           "cru" | "local";
}

function toOrgWorker(orgId: string) {
  return (w: { id: string; name: string; role: string; siteId?: string; available: boolean }): OrgWorker => ({
    id:        w.id,
    name:      w.name,
    role:      w.role,
    orgId,
    projectId: w.siteId,
    available: w.available,
    source:    "cru",
  });
}

/** Returns all workers for an org, optionally filtered to a site/project. */
export async function getOrgWorkforce(orgId: string, siteId?: string): Promise<OrgWorker[]> {
  const workers = await getCruWorkersForOrg(orgId, siteId);
  return workers.map(toOrgWorker(orgId));
}

/** Returns workers for a specific role (e.g. "mechanic", "driver"). */
export async function getOrgWorkersByRole(orgId: string, role: string): Promise<OrgWorker[]> {
  const workers = await getCruWorkersByRole(orgId, role);
  return workers.map(toOrgWorker(orgId));
}

/** Returns all mechanics and drivers — used by MX scheduling and work order assignment. */
export async function getOrgMechanicsAndDrivers(orgId: string): Promise<OrgWorker[]> {
  const workers = await getCruMechanicsAndDrivers(orgId);
  return workers.map(toOrgWorker(orgId));
}
```

- [ ] **Step 3: Create `src/lib/registry/index.ts`**

```ts
export * from "./assets";
export * from "./workforce";
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/lib/registry/
git commit -m "feat(registry): add OrgAssetRegistry and OrgWorkforceRegistry"
```

---

### Task 7: Migrate MX to use OrgWorkforceRegistry

**Files:**
- Modify: `src/app/(shell)/modules/mx/work-orders/[id]/page.tsx`
- Modify: `src/app/(shell)/modules/mx/scheduling/page.tsx`

Both files currently call `getCruMechanicsAndDrivers` from `@/lib/integrations/cru` directly. Replace with `getOrgMechanicsAndDrivers` from the registry.

- [ ] **Step 1: Update `src/app/(shell)/modules/mx/work-orders/[id]/page.tsx`**

Find this import:

```ts
import { getCruMechanicsAndDrivers } from "@/lib/integrations/cru";
import type { CruWorker } from "@/lib/integrations/cru";
```

Replace with:

```ts
import { getOrgMechanicsAndDrivers } from "@/lib/registry";
import type { OrgWorker } from "@/lib/registry";
```

Find the call site (around line 71):

```ts
getCruMechanicsAndDrivers(currentUser.id)
```

Replace with:

```ts
getOrgMechanicsAndDrivers(currentOrganization.id)
```

Find all references to `CruWorker` type in this file and replace with `OrgWorker`.

- [ ] **Step 2: Update `src/app/(shell)/modules/mx/scheduling/page.tsx`**

Apply the same substitution:

Find:
```ts
import { getCruMechanicsAndDrivers } from "@/lib/integrations/cru";
import type { CruWorker } from "@/lib/integrations/cru";
```

Replace with:
```ts
import { getOrgMechanicsAndDrivers } from "@/lib/registry";
import type { OrgWorker } from "@/lib/registry";
```

Find the call site (around line 406):
```ts
getCruMechanicsAndDrivers(currentUser.id)
```

Replace with:
```ts
getOrgMechanicsAndDrivers(currentOrganization.id)
```

Replace all `CruWorker` type references with `OrgWorker`.

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 4: Verify MX still works**

```bash
npm run dev
```

Open http://localhost:3000/modules/mx/scheduling and http://localhost:3000/modules/mx/work-orders — mechanics list should load as before (falls back to mock data).

- [ ] **Step 5: Commit**

```bash
git add src/app/\(shell\)/modules/mx/work-orders/\[id\]/page.tsx \
        src/app/\(shell\)/modules/mx/scheduling/page.tsx
git commit -m "refactor(mx): use OrgWorkforceRegistry instead of CRU adapter directly"
```

---

### Task 8: ShellEmitter — OrgProvider state + useShellEmitter hook

**Files:**
- Modify: `src/providers/OrgProvider.tsx`
- Create: `src/hooks/useShellEmitter.ts`

- [ ] **Step 1: Update `src/providers/OrgProvider.tsx`**

Add these imports at the top (after existing imports):

```ts
import type { Issue, ActivityEvent } from "@/types/domain";
```

Add two new fields to the `OrgContextValue` interface:

```ts
interface OrgContextValue {
  // ...existing fields...
  emittedIssues:      Issue[];
  emittedActivity:    ActivityEvent[];
  addEmittedIssue:    (issue: Issue) => void;
  addEmittedActivity: (event: ActivityEvent) => void;
}
```

Inside `OrgProvider`, add two new state variables after the existing `config` state:

```ts
const [emittedIssues,   setEmittedIssues]   = useState<Issue[]>([]);
const [emittedActivity, setEmittedActivity] = useState<ActivityEvent[]>([]);

function addEmittedIssue(issue: Issue): void {
  setEmittedIssues((prev) => [issue, ...prev]);
}

function addEmittedActivity(event: ActivityEvent): void {
  setEmittedActivity((prev) => [event, ...prev]);
}
```

Add to the context value object:

```ts
emittedIssues,
emittedActivity,
addEmittedIssue,
addEmittedActivity,
```

- [ ] **Step 2: Create `src/hooks/useShellEmitter.ts`**

```ts
"use client";

import { useOrg } from "@/providers/OrgProvider";
import type { ModuleId } from "@/types/org";
import type { IssueSeverity } from "@/types/domain";

export interface CreateIssueInput {
  title:     string;
  module:    ModuleId;
  severity:  IssueSeverity;
  projectId: string;
  assetId?:  string;
  description?: string;
}

export interface CreateActivityInput {
  actorName:  string;
  action:     string;
  entityType: string;
  entityName: string;
  projectId:  string;
  module:     ModuleId | "shell";
  targetType?: "issue" | "alert" | "asset" | "project";
  targetId?:  string;
}

/**
 * Gives modules a typed write path back to the shell.
 * Phase 1: mutates OrgProvider in-memory state.
 * Phase 3: calls API and persists to Supabase.
 */
export function useShellEmitter() {
  const { addEmittedIssue, addEmittedActivity, currentUser } = useOrg();

  /** Emits an issue to the shell. Returns the new issue ID. */
  function emitIssue(input: CreateIssueInput): string {
    const id = crypto.randomUUID();
    addEmittedIssue({
      id,
      title:         input.title,
      module:        input.module,
      severity:      input.severity,
      project_id:    input.projectId,
      created_at:    new Date().toISOString(),
      assignee_name: null,
      status:        "open",
      asset_id:      input.assetId,
      description:   input.description,
    });
    return id;
  }

  /** Emits an activity event to the shell. */
  function emitActivity(input: CreateActivityInput): void {
    addEmittedActivity({
      id:          crypto.randomUUID(),
      actor_name:  input.actorName,
      action:      input.action,
      entity_type: input.entityType,
      entity_name: input.entityName,
      project_id:  input.projectId,
      module:      input.module,
      timestamp:   new Date().toISOString(),
      target_type: input.targetType,
      target_id:   input.targetId,
    });
  }

  return { emitIssue, emitActivity, currentUser };
}
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/providers/OrgProvider.tsx src/hooks/useShellEmitter.ts
git commit -m "feat(shell): add ShellEmitter — emitIssue and emitActivity"
```

---

### Task 9: Fix field scope — escalation path

**Files:**
- Create: `src/components/modules/fix/FixEscalateButton.tsx`
- Modify: `src/app/(shell)/modules/fix/page.tsx`

The Fix page already reads `role` from URL search params via `FixLaunchContext`. When role is `superintendent` or `foreman` (field scope) and an asset is in context, show an Escalate button. Clicking it calls `useShellEmitter` to create an issue, then creates an MX work order.

- [ ] **Step 1: Create `src/components/modules/fix/FixEscalateButton.tsx`**

```tsx
"use client";

import React, { useState } from "react";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { useShellEmitter } from "@/hooks/useShellEmitter";
import { createWorkOrder } from "@/lib/mx/workOrdersService";

interface FixEscalateButtonProps {
  assetId:    string;
  assetName:  string;
  projectId:  string;
}

/**
 * Shown to field roles (superintendent, foreman) when they cannot resolve
 * an equipment issue during field diagnosis.
 * Escalation: emits an Issue to the shell + creates an MX work order.
 */
export function FixEscalateButton({ assetId, assetName, projectId }: FixEscalateButtonProps) {
  const { emitIssue, emitActivity, currentUser } = useShellEmitter();
  const [state, setState] = useState<"idle" | "done">("idle");

  function handleEscalate() {
    // 1. Emit issue to shell
    const issueId = emitIssue({
      title:       `Field escalation — ${assetName} requires mechanic`,
      module:      "fix",
      severity:    "high",
      projectId,
      assetId,
      description: `Field diagnostic could not resolve the issue. Escalated by ${currentUser.name}.`,
    });

    // 2. Create MX work order
    createWorkOrder({
      title:            `Field escalation — ${assetName}`,
      description:      `Escalated from Fix field diagnostic by ${currentUser.name}.`,
      category:         "corrective",
      priority:         "high",
      equipmentId:      assetId,
      equipmentLabel:   assetName,
      projectId,
      requestedBy:      currentUser.name,
      requestedByUserId: currentUser.id,
      requestedDate:    new Date().toISOString().slice(0, 10),
      readinessImpact:  "at_risk",
      opsBlocking:      false,
    });

    // 3. Emit activity
    emitActivity({
      actorName:  currentUser.name,
      action:     "escalated",
      entityType: "equipment",
      entityName: assetName,
      projectId,
      module:     "fix",
      targetType: "issue",
      targetId:   issueId,
    });

    setState("done");
  }

  if (state === "done") {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-teal/10 border border-teal/30 text-teal text-sm font-semibold">
        <CheckCircle size={16} />
        Mechanic dispatched — work order created
      </div>
    );
  }

  return (
    <button
      onClick={handleEscalate}
      className="flex items-center gap-2 px-4 py-3 rounded-lg bg-status-warning/10 border border-status-warning/30 text-status-warning text-sm font-semibold hover:bg-status-warning/20 transition-colors"
    >
      <AlertTriangle size={16} />
      Escalate — dispatch mechanic
    </button>
  );
}
```

- [ ] **Step 2: Confirm the import**

`createWorkOrder` is the correct export from `@/lib/mx/workOrdersService`. Add it to the import at the top of `FixEscalateButton.tsx`:

```ts
import { createWorkOrder } from "@/lib/mx/workOrdersService";
```

- [ ] **Step 3: Add field scope section to `src/app/(shell)/modules/fix/page.tsx`**

The Fix page already reads `role` and `assetId` from search params. Add the `FixEscalateButton` import and render it inside the context banner when the role is a field scope role and an asset is present.

Add the import at the top of the file (after existing imports):

```ts
import { FixEscalateButton } from "@/components/modules/fix/FixEscalateButton";
```

Locate the context banner section (around line 89). Inside the banner, after the context chips div, add this block to render the escalate button for field roles. Find this closing tag pattern in the banner:

```tsx
              </div>
            </div>
          </div>
          <Link
            href="/modules/fix"
```

Add the escalate button before the closing of the header content area. Find where `contextChips` are rendered and add after the chips section, still inside the banner:

```tsx
          {/* Field escalation — shown for superintendent/foreman when asset is in context */}
          {asset && (role === "superintendent" || role === "foreman") && (
            <div className="px-5 pb-5 border-t border-teal/20 pt-4 mt-2">
              <p className="text-xs text-content-muted mb-3">
                Could not resolve in the field?
              </p>
              <FixEscalateButton
                assetId={asset.id}
                assetName={asset.name}
                projectId={asset.project_id}
              />
            </div>
          )}
```

The Fix page is a Server Component. To use `role` here it must come from search params (already passed as `role` in `FixLaunchContext`). Confirm the `role` variable is read from `params.role` — add it if not present:

```ts
const role = typeof params.role === "string" ? params.role : null;
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit
```

Expected: no output.

- [ ] **Step 5: Test the escalation path**

```bash
npm run dev
```

Navigate to:
```
http://localhost:3000/modules/fix?assetId=asset_001&role=foreman&source=dashboard&projectId=proj_highland_002
```

You should see the context banner with the asset in context, and an "Escalate — dispatch mechanic" button below the chips. Click it — button should change to "Mechanic dispatched — work order created".

Navigate to http://localhost:3000/modules/mx/work-orders — the new work order should appear in the list.

- [ ] **Step 6: Commit**

```bash
git add src/components/modules/fix/FixEscalateButton.tsx \
        src/app/\(shell\)/modules/fix/page.tsx
git commit -m "feat(fix): add field scope escalation path — foreman/supt can dispatch mechanic"
```

---

## Verification

After all tasks:

```bash
npx tsc --noEmit && npm run build
```

Expected: clean build, no type errors.

**Manual smoke test:**
1. Dashboard as **owner** → 6 module tiles visible
2. Dashboard as **mechanic** → only MX, Fix, Inspect visible (CRU, Datum, OPS hidden)
3. Dashboard as **foreman** → Fix visible (field scope), CRU visible (read)
4. Fix page with `role=foreman&assetId=asset_001` → escalate button visible, mechanic scope → no escalate button
5. MX scheduling page → mechanics list loads (now via OrgWorkforceRegistry)
