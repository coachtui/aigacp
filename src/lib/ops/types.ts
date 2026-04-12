export type WorkOrderStatus   = "open" | "in_progress" | "waiting_parts" | "complete";
export type WorkOrderPriority = "low" | "medium" | "high";
export type RequestType       = "mason" | "pump_truck" | "equipment";
export type RequestStatus     = "pending" | "approved" | "assigned";

// Legacy — kept for CRU-event display in the pour schedule (CRU has its own
// simplified status model). New OPS pours use PourStatus from pourRules.ts.
export type PourEventStatus = "planned" | "confirmed" | "completed";

export interface WorkOrder {
  id:              string;
  title:           string;
  jobsite:         string;
  equipmentId?:    string;
  /** Display name — always populated */
  assignedToLabel: string;
  /** CRU worker ID — present when assigned through CRU integration */
  assignedToId?:   string;
  /** CRU role (mechanic / driver / mason / foreman) */
  assignedToRole?: string;
  status:          WorkOrderStatus;
  priority:        WorkOrderPriority;
  createdAt:       string;
  /** Links back to the Request that spawned this work order */
  sourceType?:     "request";
  sourceId?:       string;
  /** Module that provided the assignee — 'cru' when worker came from CRU integration */
  sourceModule?:   "ops" | "cru";
}

export interface Request {
  id:                  string;
  type:                RequestType;
  jobsite:             string;
  dateNeeded:          string;
  notes:               string;
  status:              RequestStatus;
  requestedBy?:        string;
  requestedByUserId?:  string;
  /** Set when request is assigned through CRU worker selection */
  assignedToId?:       string;
  assignedToLabel?:    string;
  assignedToRole?:     string;
  /** Number of workers / units requested (e.g. mason headcount) */
  requestedCount?:     number;
  /** ID of the PourEvent that auto-generated this request on approval. */
  sourcePourId?:       string;
}

// ── Pour workflow types ───────────────────────────────────────────────────────

import type { PourStatus, PourType } from "./pourRules";

export interface PumpRequest {
  requested:  boolean;
  pumpType?:  string;
  notes?:     string;
}

export interface MasonRequest {
  requested:   boolean;
  masonCount?: number;
  notes?:      string;
}

export interface PourEvent {
  id:                 string;
  /** Org this pour belongs to — used as scope boundary for Phase 3 RLS. */
  orgId:              string;
  /** Resolved project ID for this jobsite (links to org project list). */
  jobsiteId?:         string;
  /** Display name of the jobsite — derived from the project name at creation time. */
  location:           string;
  date:               string;   // "YYYY-MM-DD"
  time:               string;   // "HH:MM"
  pourType:           PourType;
  yardage:            number;
  estimatedDuration?: string;
  notes?:             string;
  // Planned resource needs
  pumpRequest:        PumpRequest;
  masonRequest:       MasonRequest;
  // Workflow
  status:             PourStatus;
  createdBy:          string;   // user ID
  createdByName:      string;
  requestedAt:        string;   // ISO datetime
  // Approval
  approvedBy?:        string;
  approvedByName?:    string;
  approvedAt?:        string;
  rejectedBy?:        string;
  rejectedByName?:    string;
  rejectionReason?:   string;
  // Cancellation
  canceledBy?:        string;
  canceledByName?:    string;
  canceledAt?:        string;
  cancellationReason?: string;
  // Future-readiness — not wired yet; present for model completeness
  relatedWorkOrderIds:  string[];
  equipmentAssignments: string[];
  /** Reserved: resource clash detection */
  conflicts?:         boolean;
}

/** Input shape for creating a new pour — workflow fields are computed by the service. */
export interface CreatePourInput {
  orgId:             string;
  jobsiteId:         string;
  location:          string;   // display name — derived from the selected jobsite
  date:              string;
  time:              string;
  pourType:          PourType;
  yardage:           number;
  estimatedDuration?: string;
  notes?:            string;
  pumpRequest:       PumpRequest;
  masonRequest:      MasonRequest;
  createdBy:         string;
  createdByName:     string;
}

// Legacy PourEvent shape used by the API-layer service.ts (for the /api/ops/pour-schedule
// route). Kept separately so the API route doesn't need to be changed in Phase 1–2.
export interface LegacyPourEvent {
  id:           string;
  jobsite:      string;
  date:         string;
  yardage:      number;
  pumpRequired: boolean;
  crewRequired: string;
  status:       PourEventStatus;
  conflicts?:   boolean;
}
