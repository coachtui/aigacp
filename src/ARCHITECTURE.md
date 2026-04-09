# AIGA Construction Platform — Architecture Blueprint

Version: 1.1  
Status: Active System Blueprint  
Purpose: Defines system structure, ownership, and build rules for all development

---

# 1. SYSTEM OVERVIEW

## What AIGA Is

AIGA Construction Platform is a **multi-tenant construction operating system**.

It is not a collection of apps.

It is:
> a single platform that coordinates field operations, equipment diagnostics, inspections, and geospatial workflows.

---

## Core Structure

```
Shell (Platform Layer)
├── Dashboard
├── Projects
├── Issues / Alerts / Activity
├── Navigation / Search / AI
└── Context (Org + Project)

Modules (Execution Layer)
├── CRU (Crews / Field Ops)
├── Fix (Diagnostics)
├── Inspect (Inspections)
└── Datum (Geospatial)

Data Layer (Future)
├── Projects
├── Issues
├── Assets
├── Crews
├── Inspections
```

---

## Guiding Principle

> Single operating system with modular execution layers

- Shell = orchestration + visibility
- Modules = execution

---

# 2. TENANCY MODEL

## Hierarchy

```
AIGA Platform
→ Organization (tenant / customer company)
→ Project
→ Work Surfaces (pages + modules)
```

---

## Scope Ownership

| Scope | Owns |
|------|------|
| Platform | Shell, navigation, AI, global admin |
| Organization | Users, roles, entitlements, projects |
| Project | Issues, alerts, assets, crews, activity |
| Modules | Workflows only (no global ownership) |

---

## Key Rules

- All operational data is **project-scoped**
- Organizations isolate data
- AIGA admins may have cross-org visibility
- No per-customer instance (shared platform)

---

# 3. DOMAIN MODEL (CORE ENTITIES)

## Organization
- id, name, slug
- owns users, projects, entitlements

## Project
- id, name, status, phase, location
- belongs to org
- owns issues, alerts, assets, crews

## User
- id, name, role
- belongs to org

## Role
- owner, admin, pm, project_engineer, superintendent, foreman, mechanic
- grouped: office / field / maintenance / oversight

---

## Asset
- equipment entity
- tied to project
- generates issues

## Crew
- group of workers
- tied to project
- managed via CRU

---

## Issue
- core problem/action unit
- may link to:
  - asset
  - inspection
- used across all modules

## Alert
- notification layer
- may link to issue

## ActivityEvent
- immutable log
- links everything together

---

## Future Entities

### Inspection (Inspect)
- generates issues

### DiagnosticSession (Fix)
- resolves issues

---

# 4. ROUTING STRATEGY

## Current (Active)

Flat routes + context-driven:

```
/dashboard
/projects/[projectId]
/issues
/issues/[issueId]
/alerts
/alerts/[alertId]
/modules/fix
/modules/cru
```

---

## Why Flat Routing

- no auth yet
- single org context
- faster iteration
- simpler mental model

---

## Future (Not Yet)

```
/orgs/[orgSlug]/projects/[projectSlug]/...
```

Transition only when:
- auth exists
- backend exists
- multi-org navigation matters

---

## Rule

> Context drives behavior, not URL depth

---

# 5. CONTEXT MODEL

## Global Context (OrgProvider)

```
currentOrganization
currentProject
currentUser
role
enabledModules
features
```

---

## Rules

- All pages use `useOrg()`
- No prop drilling
- No duplicate context sources

---

## Context Flow

```
OrgProvider
→ Layout
→ Pages
→ Modules
```

---

## UI State (UIProvider)

- sidebarCollapsed
- assistantOpen
- searchOpen

---

# 6. MODULE ARCHITECTURE

## Shell Owns

- Issues
- Alerts
- Activity
- Assets
- Crews
- Dashboard

---

## Modules Own

| Module | Responsibility |
|--------|---------------|
| CRU | crew operations |
| Fix | diagnostics |
| Inspect | inspections |
| Datum | geospatial |

---

## Module Rules

Modules:
- DO consume context
- DO emit events (issues, activity)

Modules:
- DO NOT own global state
- DO NOT depend on other modules
- DO NOT redefine domain entities

---

## Module Launch Pattern

```
Dashboard / Project
→ Module
→ Context banner
→ Workflow
```

---

# 7. CONTEXT HANDOFF (CRITICAL)

## Standard Pattern

Use query params:

```
/modules/fix?issueId=123&assetId=cat330&source=issue-detail
/modules/fix?issueId=123&assetId=cat330&source=project-cc
```

---

## Rules

- ALWAYS include `source`
- NEVER use global state
- NEVER use localStorage

---

## Behavior

Fix module:
- reads params
- shows context banner
- does not persist context

---

# 8. ROLE MODEL

## Roles

- owner / admin
- pm
- project_engineer
- superintendent
- foreman
- mechanic

---

## Groups

| Group | Roles |
|------|------|
| oversight | owner/admin |
| office | pm, engineer |
| field | superintendent, foreman |
| maintenance | mechanic |

---

## Rules

- role affects:
  - data visibility
  - actions
  - emphasis

- role does NOT:
  - change layout
  - create separate dashboards

---

# 9. ENTITLEMENT MODEL

## Levels

### Module Access

```
enabledModules: ["cru", "fix"]
```

### Feature Access

```
features.fix.ai_diagnostics = true
```

---

## UI Rules

- disabled = visible but locked
- never silently hide
- always show upgrade path (future)

---

# 10. WORKFLOW MODEL

## Core Loop

```
Dashboard
→ Project
→ Issue / Alert
→ Module (Fix / Inspect / CRU)
→ Resolution
→ Activity
```

---

## Key Workflows

### Inspect → Issue → Fix
### Alert → Issue → Action
### Project → Issue → Module

---

## Handoff Rules

- use query params
- include source
- no shared state

---

# 11. STATE MANAGEMENT

## Current

- OrgProvider
- UIProvider

---

## No global state library yet

---

## Introduce later only when:

- backend exists → React Query
- complex UI state → Zustand

---

# 12. DEVELOPMENT PHASES

## Phase 1 (current)
- shell
- dashboard
- issues/alerts
- mock flows

## Phase 2 (current/next)
- project command center
- role-aware behavior
- cross-linking

## Phase 3
- backend
- auth
- real data

## Phase 4
- full module integration

---

# 13. ARCHITECTURAL PRINCIPLES

1. Context-driven, not route-driven  
2. One shell, multiple modules  
3. No duplicated domain logic  
4. Modules are consumers, not owners  
5. Handoffs via query params  
6. Role-aware, not role-fragmented  
7. Mock data defines API contract  
8. UI reflects system state  

---

# 14. BUILD VALIDATION CHECKLIST

Before adding any feature:

- Does this belong to shell or module?
- Is context coming from useOrg()?
- Is data duplicated anywhere?
- Is this project-scoped?
- Is role affecting logic correctly?
- Is context passed via URL if needed?
- Is this consistent with modules not owning state?
