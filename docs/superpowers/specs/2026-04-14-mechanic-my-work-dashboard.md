# Mechanic "My Work" — Dashboard Card + Page

**Date:** 2026-04-14
**Scope:** Phase 1–2 (mock data, no backend)

---

## Problem

The mechanic dashboard today shows a shop-wide work order queue (`WorkOrderQueueCard`) — a priority breakdown of all WOs. That is a shop manager view, not a personal dispatch view. A mechanic arriving for their shift has no way to see at a glance what's assigned to them specifically.

---

## Solution

Replace `WorkOrderQueueCard` with `MyWorkCard` in the mechanic's dashboard metric row. Add a `/modules/mx/my-work` page for the full detail view.

---

## Data / Identity

Tony Reeves logs in as `currentUser.id = "cru_w_001"` (mechanic persona in `src/lib/config/org.ts`). Work orders store `assignedMechanicIds: string[]` using CRU worker IDs. The filter is a direct match — no data model changes needed.

**Filter:** `wo.assignedMechanicIds.includes(currentUser.id) && !["completed", "canceled"].includes(wo.status)`

This surfaces:
- `in_progress` — active work
- `scheduled` — upcoming assignments
- `waiting_parts` / `blocked` — stalled but still owned
- `approved` / `open` / `triage` / `draft` — anything not yet closed

---

## Dashboard Card — `MyWorkCard`

**Location:** `src/components/dashboard/MyWorkCard.tsx`

**Replaces:** `WorkOrderQueueCard` — only for `roleGroup === "maintenance"`

**Layout:**
- Header: "My Work" label + assigned count badge + "View all →" link to `/modules/mx/my-work`
- List of up to 4 assigned open WOs
- Sort order: `in_progress` first → `scheduled` → `waiting_parts` / `blocked` → rest, then by priority within each group
- Each row: priority dot + WO number + equipment label (truncated) + status badge
- Empty state: "No work assigned" with muted styling
- Card accent: gold border if any WO is `critical` priority (matches existing card convention)

**Data source:** `useMx()` + `useOrg()` — filter in the component, no new hook needed.

---

## My Work Page — `/modules/mx/my-work`

**Location:** `src/app/modules/mx/my-work/page.tsx`

**Accessible from:** "View all →" link in `MyWorkCard`

**Layout:**
- Page title: "My Work"
- Subtitle: today's date + assigned WO count
- Grouped by status:
  - **Active** (`in_progress`) — shown first, no group label needed if obvious
  - **Scheduled** — shows `scheduledStart` time if set
  - **Waiting / Blocked** — with status label explaining why stalled
- Each WO row: WO number, title, equipment label, priority badge, status badge, `scheduledStart` if present
- Each row links to the existing WO detail page (`/modules/mx/work-orders/[id]`)
- Empty state: "You have no open work orders"

**No new provider, no new data fetching** — reads from existing `MxProvider` state.

---

## What Does NOT Change

- `WorkOrderQueueCard` — remains intact, used by shop manager views (if/when a shop manager role is added)
- `MxProvider`, `workOrdersService`, `MxWorkOrder` types — no changes
- Mock data — no changes
- Other roles' dashboard — unaffected

---

## Files to Create / Modify

| File | Change |
|---|---|
| `src/components/dashboard/MyWorkCard.tsx` | Create — mechanic personal work card |
| `src/app/modules/mx/my-work/page.tsx` | Create — full My Work page |
| `src/components/dashboard/OpenIssuesCard.tsx` | Modify — swap `WorkOrderQueueCard` → `MyWorkCard` for mechanic |

---

## Out of Scope

- `RecentActivityFeed` role-awareness (separate task)
- Scheduled time personalization per mechanic (`MechanicAssignment` table — Phase 3)
- Push notifications or shift reminders
- Multi-mechanic support (only Tony / `cru_w_001` works in Phase 1–2)
