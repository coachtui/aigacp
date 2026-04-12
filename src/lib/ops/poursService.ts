/**
 * poursService — localStorage-backed repository for OPS pour events.
 *
 * Architecture notes:
 *  - All state reads go through load(); all writes call persist().
 *  - The localStorage key is the only persistence seam. To swap to Supabase,
 *    replace load() and persist() with async fetch/upsert calls and update
 *    OpsProvider to await them (or swap to React Query mutations).
 *  - Permission rules are enforced here (service layer) AND in the UI.
 *    Functions return null when a rule prevents the action.
 *  - Non-deterministic values (UUIDs, timestamps) are generated here so callers
 *    don't need to pre-generate them.
 */

import type { PourEvent, CreatePourInput } from "./types";
import type { UserRole } from "@/types/org";
import {
  POUR_STATUS,
  isValidTransition,
  isAdminRole,
  canApprovePour,
  canCancelPour,
  canSubmitForApproval,
  canEditPour,
} from "./pourRules";

const STORAGE_KEY = "aigacp:ops:pours";

// ── Seed data ─────────────────────────────────────────────────────────────────
// Used when localStorage has no existing data (first run / cleared storage).
// Mirror these in mock-data.ts if the legacy API route needs to stay in sync.

const SEED_POURS: PourEvent[] = [
  {
    id:                   "pour_001",
    location:             "Highland Tower — Phase 2",
    date:                 "2026-04-12",
    time:                 "07:00",
    pourType:             "Slab",
    yardage:              220,
    estimatedDuration:    "4 hours",
    notes:                "Level 5 deck pour.",
    pumpRequest:          { requested: true, pumpType: "60m Boom" },
    masonRequest:         { requested: false },
    status:               POUR_STATUS.APPROVED,
    createdBy:            "user_owner_001",
    createdByName:        "Marcus Webb",
    requestedAt:          "2026-04-10T08:00:00Z",
    approvedBy:           "user_owner_001",
    approvedByName:       "Marcus Webb",
    approvedAt:           "2026-04-10T09:00:00Z",
    relatedWorkOrderIds:  [],
    equipmentAssignments: [],
  },
  {
    id:                   "pour_002",
    location:             "Riverside District Parking",
    date:                 "2026-04-12",
    time:                 "06:30",
    pourType:             "Deck",
    yardage:              180,
    estimatedDuration:    "3.5 hours",
    notes:                "Level 3 deck pour. Potential timing conflict with Tower pour.",
    pumpRequest:          { requested: true, pumpType: "60m Boom", notes: "60m boom required for deck pour." },
    masonRequest:         { requested: true, masonCount: 4, notes: "4 masons for finishing." },
    status:               POUR_STATUS.PENDING_APPROVAL,
    createdBy:            "user_foreman_001",
    createdByName:        "Dan Ortega",
    requestedAt:          "2026-04-09T14:00:00Z",
    relatedWorkOrderIds:  [],
    equipmentAssignments: [],
    conflicts:            true,
  },
  {
    id:                   "pour_003",
    location:             "Eastside Medical Campus",
    date:                 "2026-04-14",
    time:                 "07:30",
    pourType:             "Foundation",
    yardage:              95,
    pumpRequest:          { requested: false },
    masonRequest:         { requested: false },
    status:               POUR_STATUS.DRAFT,
    createdBy:            "user_owner_001",
    createdByName:        "Marcus Webb",
    requestedAt:          "2026-04-09T10:00:00Z",
    relatedWorkOrderIds:  [],
    equipmentAssignments: [],
  },
  {
    id:                   "pour_004",
    location:             "Highland Tower — Phase 2",
    date:                 "2026-04-08",
    time:                 "06:00",
    pourType:             "Slab",
    yardage:              310,
    estimatedDuration:    "5 hours",
    pumpRequest:          { requested: true, pumpType: "40m Boom" },
    masonRequest:         { requested: true, masonCount: 6 },
    status:               POUR_STATUS.COMPLETED,
    createdBy:            "user_owner_001",
    createdByName:        "Marcus Webb",
    requestedAt:          "2026-04-06T08:00:00Z",
    approvedBy:           "user_owner_001",
    approvedByName:       "Marcus Webb",
    approvedAt:           "2026-04-06T09:00:00Z",
    relatedWorkOrderIds:  [],
    equipmentAssignments: [],
  },
];

// ── Internal state ────────────────────────────────────────────────────────────

let _cache: PourEvent[] | null = null;

function load(): PourEvent[] {
  if (_cache !== null) return _cache;
  if (typeof window === "undefined") {
    // SSR path — return seed data without caching (will re-run on client)
    return SEED_POURS.map((p) => ({ ...p }));
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      _cache = JSON.parse(raw) as PourEvent[];
      return _cache;
    }
  } catch {
    // Ignore parse errors — fall through to seed
  }
  _cache = SEED_POURS.map((p) => ({ ...p }));
  persist(_cache);
  return _cache;
}

function persist(pours: PourEvent[]): void {
  _cache = pours;
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pours));
  } catch {
    // Storage quota exceeded or private browsing — ignore
  }
}

function replace(updated: PourEvent): void {
  const pours = load();
  persist(pours.map((p) => (p.id === updated.id ? updated : p)));
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getAllPours(): PourEvent[] {
  return load();
}

export function getPourById(id: string): PourEvent | undefined {
  return load().find((p) => p.id === id);
}

/**
 * Create a new pour.
 * asDraft=true → Draft; asDraft=false → Pending Approval.
 */
export function createPour(input: CreatePourInput, asDraft: boolean): PourEvent {
  const pour: PourEvent = {
    ...input,
    id:                   crypto.randomUUID(),
    status:               asDraft ? POUR_STATUS.DRAFT : POUR_STATUS.PENDING_APPROVAL,
    requestedAt:          new Date().toISOString(),
    relatedWorkOrderIds:  [],
    equipmentAssignments: [],
  };
  persist([...load(), pour]);
  return pour;
}

/**
 * Update core fields of a pour.
 *
 * Behavior rules:
 *  - preserveStatus: true  — admin keeps the pour at its current status (no re-approval needed).
 *  - submitForApproval: true — saves the edits and also transitions to Pending Approval
 *                             (used when admin or creator clicks "Save & Submit" in edit mode).
 *  - default (no options) — if a non-admin is editing their own Approved pour the status
 *                           automatically resets to Pending Approval so it gets re-reviewed.
 *
 * Returns null if permissions or state prevent the edit.
 */
export function editPour(
  id: string,
  updates: Omit<CreatePourInput, "createdBy" | "createdByName">,
  actorRole: UserRole,
  actorId: string,
  options?: { preserveStatus?: boolean; submitForApproval?: boolean },
): PourEvent | null {
  const pour = getPourById(id);
  if (!pour) return null;
  if (!canEditPour(actorRole, pour, actorId)) return null;

  // Determine the resulting status.
  let newStatus = pour.status;

  if (options?.submitForApproval && canSubmitForApproval(actorRole, pour, actorId)) {
    newStatus = POUR_STATUS.PENDING_APPROVAL;
  } else if (!options?.preserveStatus && !isAdminRole(actorRole) && pour.status === POUR_STATUS.APPROVED) {
    // Non-admin editing an Approved pour → requires fresh approval.
    newStatus = POUR_STATUS.PENDING_APPROVAL;
  }

  const clearApproval = newStatus === POUR_STATUS.PENDING_APPROVAL && pour.status === POUR_STATUS.APPROVED;

  const updated: PourEvent = {
    ...pour,
    ...updates,
    status: newStatus,
    ...(clearApproval ? {
      approvedBy:      undefined,
      approvedByName:  undefined,
      approvedAt:      undefined,
    } : {}),
  };
  replace(updated);
  return updated;
}

/**
 * Transition a Draft or Rejected pour to Pending Approval.
 */
export function submitForApproval(
  id: string,
  actorRole: UserRole,
  actorId: string,
): PourEvent | null {
  const pour = getPourById(id);
  if (!pour) return null;
  if (!canSubmitForApproval(actorRole, pour, actorId)) return null;
  const updated: PourEvent = { ...pour, status: POUR_STATUS.PENDING_APPROVAL, rejectionReason: undefined };
  replace(updated);
  return updated;
}

/**
 * Approve a Pending Approval pour. Admin/owner only.
 */
export function approvePour(
  id: string,
  actorRole: UserRole,
  actorId: string,
  actorName: string,
): PourEvent | null {
  const pour = getPourById(id);
  if (!pour) return null;
  if (!canApprovePour(actorRole)) return null;
  if (!isValidTransition(pour.status, POUR_STATUS.APPROVED)) return null;
  const updated: PourEvent = {
    ...pour,
    status:          POUR_STATUS.APPROVED,
    approvedBy:      actorId,
    approvedByName:  actorName,
    approvedAt:      new Date().toISOString(),
    rejectedBy:      undefined,
    rejectedByName:  undefined,
    rejectionReason: undefined,
  };
  replace(updated);
  return updated;
}

/**
 * Reject a Pending Approval pour. Admin/owner only.
 */
export function rejectPour(
  id: string,
  reason: string,
  actorRole: UserRole,
  actorId: string,
  actorName: string,
): PourEvent | null {
  const pour = getPourById(id);
  if (!pour) return null;
  if (!canApprovePour(actorRole)) return null;
  if (!isValidTransition(pour.status, POUR_STATUS.REJECTED)) return null;
  const updated: PourEvent = {
    ...pour,
    status:          POUR_STATUS.REJECTED,
    rejectedBy:      actorId,
    rejectedByName:  actorName,
    rejectionReason: reason.trim() || "No reason provided.",
    approvedBy:      undefined,
    approvedByName:  undefined,
    approvedAt:      undefined,
  };
  replace(updated);
  return updated;
}

/**
 * Cancel a pour with a reason. Rules enforced via canCancelPour.
 */
export function cancelPour(
  id: string,
  reason: string,
  actorRole: UserRole,
  actorId: string,
  actorName: string,
): PourEvent | null {
  const pour = getPourById(id);
  if (!pour) return null;
  if (!canCancelPour(actorRole, pour, actorId)) return null;
  const updated: PourEvent = {
    ...pour,
    status:              POUR_STATUS.CANCELED,
    canceledBy:          actorId,
    canceledByName:      actorName,
    canceledAt:          new Date().toISOString(),
    cancellationReason:  reason.trim() || "No reason provided.",
  };
  replace(updated);
  return updated;
}

/** Dev-only: wipe localStorage and reload seed data. */
export function resetToSeed(): PourEvent[] {
  _cache = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
  return load();
}
