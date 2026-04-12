/**
 * requestsService — localStorage-backed repository for OPS dispatch requests.
 *
 * Same seam-based pattern as poursService.ts. To migrate to Supabase:
 * replace load() and persist() with async fetch/upsert calls and update
 * OpsProvider to await them (or use React Query mutations).
 *
 * SEED_REQUESTS includes a pump truck request linked to pour_001 (the
 * pre-approved seed pour) so that the DispatchStatus component shows
 * real data on first run rather than "not dispatched".
 */

import type { Request } from "./types";

const STORAGE_KEY = "aigacp:ops:requests";

// ── Seed data ─────────────────────────────────────────────────────────────────

const SEED_REQUESTS: Request[] = [
  // Manual requests (not pour-linked)
  {
    id:          "req_001",
    type:        "mason",
    jobsite:     "Highland Tower — Phase 2",
    dateNeeded:  "2026-04-14",
    notes:       "Need 4 masons for block wall on Level 8.",
    status:      "pending",
    requestedBy: "Dan Ortega",
  },
  {
    id:          "req_002",
    type:        "pump_truck",
    jobsite:     "Riverside District Parking",
    dateNeeded:  "2026-04-12",
    notes:       "60m boom required for deck pour — Level 3.",
    status:      "approved",
    requestedBy: "Sarah Kim",
  },
  {
    id:          "req_003",
    type:        "equipment",
    jobsite:     "Eastside Medical Campus",
    dateNeeded:  "2026-04-13",
    notes:       "Compact excavator for utility trench near Building B.",
    status:      "pending",
    requestedBy: "Jake Powell",
  },
  {
    id:          "req_004",
    type:        "mason",
    jobsite:     "Eastside Medical Campus",
    dateNeeded:  "2026-04-15",
    notes:       "2 masons for stone veneer installation — lobby.",
    status:      "assigned",
    requestedBy: "Jake Powell",
  },
  // Auto-generated on approval of pour_001 (seed pour, pre-approved).
  // Mirrors what approvePour() would have created if the pour was approved via UI.
  {
    id:                  "req_pour_001_pump",
    type:                "pump_truck",
    jobsite:             "Highland Tower — Phase 2",
    dateNeeded:          "2026-04-12",
    notes:               "Pump truck for 220 yd³ pour.",
    status:              "pending",
    requestedBy:         "Marcus Webb",
    requestedByUserId:   "user_owner_001",
    sourcePourId:        "pour_001",
  },
];

// ── Internal state ────────────────────────────────────────────────────────────

let _cache: Request[] | null = null;

function load(): Request[] {
  if (_cache !== null) return _cache;
  if (typeof window === "undefined") {
    return SEED_REQUESTS.map((r) => ({ ...r }));
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      _cache = JSON.parse(raw) as Request[];
      return _cache;
    }
  } catch {
    // Ignore parse errors — fall through to seed
  }
  _cache = SEED_REQUESTS.map((r) => ({ ...r }));
  persist(_cache);
  return _cache;
}

function persist(requests: Request[]): void {
  _cache = requests;
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  } catch {
    // Storage quota exceeded or private browsing — ignore
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getAllRequests(): Request[] {
  return load();
}

export function saveAll(requests: Request[]): void {
  persist(requests);
}

/** Dev-only: wipe localStorage and reload seed data. */
export function resetToSeed(): Request[] {
  _cache = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
  return load();
}
