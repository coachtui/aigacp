# Platform Integration Design
**Date:** 2026-04-14  
**Status:** Approved  
**Scope:** Core ↔ Module architecture, entitlement bundles, role gating, org registry, event emission

---

## 1. Problem Statement

AIGACP needs a principled way to connect its shell (core platform) to its execution modules — with three complicating factors:

1. **Per-customer packaging** — not every org buys every module; entitlements must be designed in, not bolted on
2. **Dual-mode programs** — CRU and Fix (EquipIQ) are both standalone apps and AIGACP modules; the integration model must handle both
3. **Source-of-truth migration** — AIGACP aggregates from CRU and Fix today, but will become the owner and push outward in Phase 3

---

## 2. Architecture: Contract-First Module System

Every module satisfies a `ModuleContract` interface. This is the single plug-in seam between the shell and execution modules.

```ts
// src/lib/modules/module-contract.ts
interface ModuleContract {
  id:           ModuleId
  adapter:      ModuleDataAdapter    // how data flows in
  roleManifest: RoleManifest         // who sees/does what
  emitter:      ModuleEmitter        // issues + activity → shell
  bundleIds:    BundleId[]           // which packages include this module
}

type ModuleDataAdapter =
  | { type: "api";    fetch: (orgId: string, projectId: string) => Promise<unknown> }
  | { type: "embed";  buildUrl: (ctx: ModuleContext) => string }  // ModuleContext = { orgId, projectId, role, issueId?, assetId?, source }
  | { type: "native"; route: string }
```

**Adapter type by module:**
- CRU → `api` (proxy adapter at `/api/cru/ops`, never re-implements UI)
- Fix → `embed` (EquipIQ embedded; context passed via URL params)
- MX, OPS, Inspect, Datum → `native` (fully built in AIGACP)

---

## 3. Bundle Packages

Customers purchase named bundles. `enabledModules` on `OrgConfig` is **derived** from `purchasedBundles` — never set directly.

| Bundle | ID | Modules |
|---|---|---|
| Base Platform | *(always included)* | Shell: issues, alerts, activity, assets (read), workforce (read) |
| Field Ops | `field_ops` | CRU, Datum |
| Equipment | `equipment` | MX, Fix, Inspect |
| Operations | `operations` | OPS |

**Why Inspect is in Equipment (not Field Ops):** Inspect's current domain is heavy equipment inspections. The natural workflow is Inspect → Issue → MX work order → Fix resolution — all within one bundle. When Inspect expands to pour, structural, and safety inspections it will be promoted to its own standalone bundle.

**Locked state:** Modules from unpurchased bundles are visible in the launchpad with a lock icon. Never silently hidden.

### OrgConfig change
```ts
interface OrgConfig {
  // ...existing fields
  purchasedBundles: BundleId[]
  // enabledModules is now derived: all modules across purchasedBundles
}
```

---

## 4. Role × Module Matrix

Two-axis gating: **visibility** (show/hide in launchpad + nav) and **scope** (what you can do inside).

### Scope values
| Scope | Meaning |
|---|---|
| `full` | See everything, all actions |
| `read` | Visible, no write actions |
| `my_work` | Visible, scoped to own assignments only |
| `field` | Active troubleshooting, can escalate — no fleet-wide view |
| `hidden` | Not shown in launchpad or nav |

### Matrix

**Note on `viewer` role:** Viewer has read-only access to shell pages (issues, alerts, activity) but no module access. All modules are hidden for viewer.

| Module | Owner/Admin | PM | Engineer | Superintendent | Foreman | Mechanic |
|---|---|---|---|---|---|---|
| CRU | full | read | full | read | read | hidden |
| Datum | full | read | full | full | full | hidden |
| MX | full | read | read | read | read | my_work |
| Fix | full | read | read | **field** | **field** | my_work |
| Inspect | full | full | full | full | my_work | my_work |
| OPS | full | full | full | read | read | hidden |

### Scope definitions per role

**Fix — `field` (superintendent + foreman)**  
Select equipment on site → run guided field diagnostic → view fault codes + suggested fixes → escalate if unresolvable. Escalation auto-creates an MX work order. No fleet-wide view. Purpose: keep mechanics on confirmed jobs, not speculative trouble calls.

**Fix — `my_work` (mechanic)**  
Deep diagnostics on equipment linked to assigned work orders. Full fault code history. OBD scan if enabled. No fleet-wide priority view.

**MX — `my_work` (mechanic)**  
See only work orders assigned to self. Update status and add notes. No scheduling view, no visibility into other mechanics' work orders.

**Inspect — `my_work` (foreman + mechanic)**  
Submit inspections for assigned area or equipment. View own submitted inspections. No review/approval actions, no org-wide inspection list.

---

## 5. Org Registry

AIGACP becomes the hub for assets and workforce. Today it aggregates; Phase 3 it owns.

### OrgAssetRegistry (`src/lib/registry/assets.ts`)
```ts
interface OrgAsset {
  id, name, type, status
  projectId, orgId
  readiness?:          ReadinessStatus  // enriched from MX
  lastDiagnostic?:     string           // enriched from Fix
  activeWorkOrderId?:  string           // enriched from MX
}
```
- **Phase 1:** Reads shell mock assets, enriches with MX readiness + Fix diagnostic data
- **Phase 3:** Assets are created here; MX and Fix sync from AIGACP

### OrgWorkforceRegistry (`src/lib/registry/workforce.ts`)
```ts
interface OrgWorker {
  id, name, role
  orgId, projectId?
  available:          boolean   // from CRU
  activeAssignment?:  string    // from CRU
  source:             "cru" | "local"
}
```
- **Phase 1:** Thin wrapper over `getCruWorkersForOrg()`. MX and OPS always call this, never the CRU adapter directly
- **Phase 3:** Worker records live in AIGACP; CRU syncs from here for scheduling and clock-in

**Key rule:** Modules never call the CRU adapter or mock asset data directly. All data access goes through the registry. This is the seam that makes the Phase 1→3 ownership flip possible without touching module code.

---

## 6. Event Emission (Modules → Shell)

Modules never write to issues or activity directly. They call `useShellEmitter()`.

```ts
// src/hooks/useShellEmitter.ts
interface ShellEmitter {
  emitIssue:    (input: CreateIssueInput)    => void
  emitActivity: (input: CreateActivityInput) => void
}
// Phase 1: mutates OrgProvider state in-memory
// Phase 3: calls API, persists to Supabase
```

### Who emits what
| Module | emitIssue | emitActivity |
|---|---|---|
| Fix | Fault detected or field escalation triggered | Diagnostic session completed |
| MX | Work order created from alert | Status transitions (open → in_progress → completed) |
| Inspect | Inspection fails sign-off | Inspection submitted or approved |
| OPS | Request goes overdue | Pour scheduled or confirmed |

### Fix escalation path (first cross-module workflow)
```
Foreman opens Fix (field scope)
→ Runs guided diagnostic
→ Cannot resolve → hits Escalate
→ emitIssue() fires (severity: high, module: fix, assetId)
→ Issue appears in shell
→ MX creates work order from issue
→ Mechanic gets assigned
```

---

## 7. Data Flow

```
Shell / OrgProvider
  ↕ (context: org, project, role, enabledModules)
Registry Layer
  ├── OrgAssetRegistry    ← reads MX readiness, Fix diagnostic status
  ├── OrgWorkforceRegistry ← reads CRU adapter
  └── ShellEmitter         → writes issues + activity to OrgProvider
  ↕ (assets, workforce out / issues + activity in)
Modules (MX, Fix, Inspect, OPS, CRU, Datum)
```

---

## 8. New Files

| File | Purpose |
|---|---|
| `src/lib/modules/module-contract.ts` | ModuleContract, ModuleDataAdapter, RoleManifest, ModuleEmitter interfaces |
| `src/lib/modules/bundles.ts` | BundleId type, BUNDLE_REGISTRY, getModulesForBundles() |
| `src/lib/modules/role-manifest.ts` | MODULE_ROLE_MANIFEST — role × module matrix as typed data |
| `src/lib/registry/assets.ts` | OrgAsset type, getOrgAssets(), getAssetById() |
| `src/lib/registry/workforce.ts` | OrgWorker type, getOrgWorkforce(), getWorkersByRole() |
| `src/lib/registry/index.ts` | Re-exports |
| `src/hooks/useShellEmitter.ts` | emitIssue(), emitActivity() |
| `src/hooks/useModuleAccess.ts` | isModuleVisible(moduleId, role), getModuleScope(moduleId, role) |

## 9. Changed Files

| File | Change |
|---|---|
| `src/types/org.ts` | Add BundleId, ModuleScope, purchasedBundles to OrgConfig |
| `src/lib/config/org.ts` | Add purchasedBundles to MOCK_ORG_CONFIG; remove hardcoded enabledModules |
| `src/providers/OrgProvider.tsx` | Derive enabledModules from purchasedBundles; expose moduleScope(moduleId, role): ModuleScope |
| `src/lib/mx/workOrdersService.ts` | Replace direct mock asset refs with OrgAssetRegistry |
| `src/lib/ops/service.ts` | Replace direct CRU adapter calls with OrgWorkforceRegistry |
| `src/components/dashboard/ModuleLaunchpad.tsx` | Use useModuleAccess() for visibility; show locked state for unpurchased bundles |

---

## 10. Build Order

1. **Types + contracts** — BundleId, ModuleScope, ModuleContract, RoleManifest. No behavior, just shapes.
2. **Bundle registry + role manifest** — bundles.ts and role-manifest.ts. Pure data, no React.
3. **OrgProvider update + useModuleAccess** — wire purchasedBundles, build hook, update ModuleLaunchpad locked states.
4. **Registry layer** — OrgAssetRegistry and OrgWorkforceRegistry. Migrate MX + OPS consumers.
5. **ShellEmitter + Fix field scope** — useShellEmitter hook. Wire Fix escalation path. First real cross-module workflow.

---

## 11. What This Unlocks (Phase 3)

- **Org asset ownership:** Add asset CRUD to shell. Fix and MX reference AIGACP asset IDs.
- **Org workforce ownership:** Add worker management to shell. CRU syncs from AIGACP for scheduling.
- **Inspect promotion:** When second inspection domain ships, extract Inspect into its own bundle.
- **Backend:** Registry layer is the exact seam where mock returns get replaced with API calls — no module code changes required.
