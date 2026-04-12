import { MOCK_WORK_ORDERS, MOCK_REQUESTS, MOCK_POUR_EVENTS } from "./mock-data";
import type {
  WorkOrder,  WorkOrderStatus,
  Request,    RequestStatus,
  PourEvent,
} from "./types";

// ── Internal mutable state ────────────────────────────────────────────────────
// Copies from mock — never mutate the imported arrays directly.

let workOrders: WorkOrder[] = [...MOCK_WORK_ORDERS];
let requests:   Request[]   = [...MOCK_REQUESTS];
let pourEvents: PourEvent[]  = [...MOCK_POUR_EVENTS];

// ── Transition rules ──────────────────────────────────────────────────────────

export const WORK_ORDER_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  open:          ["in_progress"],
  in_progress:   ["waiting_parts", "complete"],
  waiting_parts: ["in_progress"],
  complete:      [],
};

export const REQUEST_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  pending:  ["approved"],
  approved: ["assigned"],
  assigned: [],
};

// ── Work Orders ───────────────────────────────────────────────────────────────

export function getWorkOrders(): WorkOrder[] {
  return workOrders;
}

export function createWorkOrder(
  data: Omit<WorkOrder, "id" | "createdAt">,
): WorkOrder {
  const wo: WorkOrder = {
    ...data,
    id:        crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  workOrders = [...workOrders, wo];
  return wo;
}

export function updateWorkOrderStatus(
  id: string,
  status: WorkOrderStatus,
): WorkOrder | null {
  const wo = workOrders.find((w) => w.id === id);
  if (!wo) return null;
  if (!WORK_ORDER_TRANSITIONS[wo.status].includes(status)) return null;
  const updated = { ...wo, status };
  workOrders = workOrders.map((w) => (w.id === id ? updated : w));
  return updated;
}

// ── Requests ──────────────────────────────────────────────────────────────────

export function getRequests(): Request[] {
  return requests;
}

export function createRequest(data: Omit<Request, "id">): Request {
  const req: Request = { ...data, id: crypto.randomUUID() };
  requests = [...requests, req];
  return req;
}

/**
 * Transition a request status.
 *
 * When transitioning to "assigned", an optional CRU worker can be provided.
 * The worker data is stamped onto the request and carried into the auto-created
 * work order, establishing the CRU → OPS assignment linkage.
 */
export function updateRequestStatus(
  id:      string,
  status:  RequestStatus,
  worker?: { id: string; label: string; role?: string },
): Request | null {
  const req = requests.find((r) => r.id === id);
  if (!req) return null;
  if (!REQUEST_TRANSITIONS[req.status].includes(status)) return null;

  const updated: Request = {
    ...req,
    status,
    ...(worker && status === "assigned"
      ? {
          assignedToId:    worker.id,
          assignedToLabel: worker.label,
          assignedToRole:  worker.role,
        }
      : {}),
  };
  requests = requests.map((r) => (r.id === id ? updated : r));

  // Orchestration: auto-create a Work Order when a request is assigned.
  // If a CRU worker was selected, carry their ID/label/role into the work order
  // and mark sourceModule: "cru" so the work orders board can display the origin.
  if (status === "assigned") {
    createWorkOrder({
      title:           `Dispatch: ${req.type.replace("_", " ")} — ${req.jobsite}`,
      jobsite:         req.jobsite,
      assignedToLabel: worker?.label ?? "TBD",
      assignedToId:    worker?.id,
      assignedToRole:  worker?.role,
      status:          "open",
      priority:        "medium",
      sourceType:      "request",
      sourceId:        req.id,
      sourceModule:    worker ? "cru" : "ops",
    });
  }

  return updated;
}

// ── Pour Schedule ─────────────────────────────────────────────────────────────

export function getPourSchedule(): PourEvent[] {
  return pourEvents;
}

export function createPourEvent(data: Omit<PourEvent, "id">): PourEvent {
  const event: PourEvent = { ...data, id: crypto.randomUUID() };
  pourEvents = [...pourEvents, event];
  return event;
}
