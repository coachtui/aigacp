export type WorkOrderStatus   = "open" | "in_progress" | "waiting_parts" | "complete";
export type WorkOrderPriority = "low" | "medium" | "high";
export type RequestType       = "mason" | "pump_truck" | "equipment";
export type RequestStatus     = "pending" | "approved" | "assigned";
export type PourEventStatus   = "planned" | "confirmed" | "completed";

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
}

export interface PourEvent {
  id:           string;
  jobsite:      string;
  date:         string;
  yardage:      number;
  pumpRequired: boolean;
  crewRequired: string;
  status:       PourEventStatus;
  /** Reserved: future overlap / resource clash detection */
  conflicts?:   boolean;
}
