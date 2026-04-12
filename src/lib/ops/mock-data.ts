import type { WorkOrder, Request, LegacyPourEvent } from "./types";

export const MOCK_WORK_ORDERS: WorkOrder[] = [
  {
    id:             "wo_001",
    title:          "Replace hydraulic filter — Cat 336",
    jobsite:        "Highland Tower — Phase 2",
    equipmentId:    "asset_001",
    assignedToLabel: "Tony Reeves",
    status:         "open",
    priority:       "high",
    createdAt:      "2026-04-10T07:00:00Z",
  },
  {
    id:             "wo_002",
    title:          "Inspect brake system — Mack RD690S",
    jobsite:        "Riverside District Parking",
    equipmentId:    "asset_005",
    assignedToLabel: "Marcus Jimenez",
    status:         "in_progress",
    priority:       "high",
    createdAt:      "2026-04-09T14:00:00Z",
  },
  {
    id:             "wo_003",
    title:          "Order replacement tracks — Cat D6T",
    jobsite:        "Highland Tower — Phase 2",
    equipmentId:    "asset_003",
    assignedToLabel: "Tony Reeves",
    status:         "waiting_parts",
    priority:       "medium",
    createdAt:      "2026-04-08T09:00:00Z",
  },
  {
    id:             "wo_004",
    title:          "PM service — Komatsu PC210",
    jobsite:        "Riverside District Parking",
    assignedToLabel: "Sarah Kim",
    status:         "complete",
    priority:       "low",
    createdAt:      "2026-04-07T11:00:00Z",
  },
  {
    id:             "wo_005",
    title:          "Electrical fault — Caterpillar 745",
    jobsite:        "Eastside Medical Campus",
    equipmentId:    "asset_007",
    assignedToLabel: "Derek Walsh",
    status:         "open",
    priority:       "high",
    createdAt:      "2026-04-10T06:30:00Z",
  },
  {
    id:             "wo_006",
    title:          "Tire replacement — Volvo FMX haul truck",
    jobsite:        "Eastside Medical Campus",
    assignedToLabel: "Marcus Jimenez",
    status:         "in_progress",
    priority:       "medium",
    createdAt:      "2026-04-09T08:00:00Z",
  },
];

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
