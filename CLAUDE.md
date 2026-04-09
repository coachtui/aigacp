# AIGA Construction Platform — Architecture Rules

## Session Start (REQUIRED)
Read both files before making any changes:
1. `CLAUDE.md` — rules for fast decisions
2. `src/ARCHITECTURE.md` — deeper reference for building features

---

## Platform Model
- AIGA is the umbrella platform (multi-tenant SaaS)
- Organizations = customer companies (tenants)
- Projects = operational units inside orgs
- All work is scoped to project context

Hierarchy:
AIGA Platform → Organization → Project → Work Surfaces

---

## Core Principle
Single operating system with modular execution layers.

- Shell = coordination, navigation, context
- Modules = deep workflows (CRU, Fix, Inspect, Datum)

---

## Shell Responsibilities
- Dashboard (org + project level)
- Issues / Alerts / Activity
- Navigation
- Context (OrgProvider)
- AI assistant (future)

Shell owns:
- issues
- alerts
- activity
- assets
- crews

---

## Module Responsibilities
Modules DO:
- execute workflows
- consume context
- emit events (issues, activity)

Modules DO NOT:
- own global state
- duplicate domain models
- directly depend on other modules

---

## Context Model (CRITICAL)
All pages must use:

- currentOrganization
- currentProject
- currentUser
- role
- enabledModules

From:
useOrg()

Context drives behavior — not routes.

---

## Routing Strategy (Current)
Flat routes with context:

/dashboard
/projects/[projectId]
/issues
/alerts
/modules/fix

Do NOT implement nested org/project routes yet.

---

## Context Passing
Cross-module navigation MUST use query params:

Examples:
- /modules/fix?issueId=123&assetId=cat330&source=issue-detail
- /modules/fix?issueId=123&assetId=cat330&source=project-cc

DO NOT use global state for handoffs.

---

## Role Model
Roles:
- owner/admin
- pm
- project_engineer
- superintendent
- foreman
- mechanic

Rules:
- Role affects data + actions
- Role does NOT change layout

---

## Entitlements
- Module-level access (enabledModules)
- Feature-level access (features map)

UI must:
- show locked state
- not silently hide features

---

## Key Rules
1. Context-driven, not route-driven
2. One shell, multiple modules
3. No duplicated domain logic
4. Modules are consumers, not owners
5. Handoffs via query params
6. Role-aware, not role-fragmented

---

## Current Phase
Phase 1–2:
- mock data
- no backend
- no auth
- no global state libraries

Focus:
- UI
- flows
- context handling
