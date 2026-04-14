import type { Request, LegacyPourEvent } from "./types";

export const MOCK_REQUESTS: Request[] = [
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
];

// Legacy pour events — used only by the /api/ops/pour-schedule API route.
// The pour schedule UI now reads from poursService (localStorage-backed).
// These will be removed when the API route is wired to a real backend.
export const MOCK_POUR_EVENTS: LegacyPourEvent[] = [
  { id: "pour_001", jobsite: "Highland Tower — Phase 2",     date: "2026-04-12", yardage: 220, pumpRequired: true,  crewRequired: "Structural Crew T-3", status: "confirmed" },
  { id: "pour_002", jobsite: "Riverside District Parking",   date: "2026-04-12", yardage: 180, pumpRequired: true,  crewRequired: "Concrete Crew R-1",   status: "planned", conflicts: true },
  { id: "pour_003", jobsite: "Eastside Medical Campus",      date: "2026-04-14", yardage: 95,  pumpRequired: false, crewRequired: "Concrete Crew E-2",   status: "planned" },
  { id: "pour_004", jobsite: "Highland Tower — Phase 2",     date: "2026-04-08", yardage: 310, pumpRequired: true,  crewRequired: "Structural Crew T-3", status: "completed" },
];
