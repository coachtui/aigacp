"use client";

/**
 * OpsProvider — shared OPS session state
 *
 * Follows the same createContext + useReducer + custom-hook pattern as
 * OrgProvider and UIProvider. Lives at the shell layout level so state
 * persists across all OPS sub-page navigations without resetting.
 *
 * Phase 3 migration path: swap poursService.ts load/persist for Supabase
 * calls (or React Query mutations) — no page-component changes required.
 *
 * Responsibilities:
 *   - requests + work orders (existing)
 *   - pour schedule: create, edit, submit, approve, reject, cancel
 *
 * NOT responsible for:
 *   - CRU data fetching (stays in src/lib/integrations/cru.ts)
 *   - persistence implementation (delegated to poursService)
 */

import React, { createContext, useContext, useReducer, useEffect } from "react";
import { MOCK_WORK_ORDERS } from "@/lib/ops/mock-data";
import * as poursService from "@/lib/ops/poursService";
import * as requestsService from "@/lib/ops/requestsService";
import type {
  WorkOrder,  WorkOrderStatus,
  Request as OpsRequest, RequestStatus,
  PourEvent, CreatePourInput,
} from "@/lib/ops/types";
import type { UserRole } from "@/types/org";

// ── Transition rules (WO + Request) ──────────────────────────────────────────
// Kept here because OpsProvider is the UI-state authority for these two domains.

const WORK_ORDER_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  open:          ["in_progress"],
  in_progress:   ["waiting_parts", "complete"],
  waiting_parts: ["in_progress"],
  complete:      [],
};

const REQUEST_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  pending:  ["approved"],
  approved: ["assigned"],
  assigned: [],
};

// ── State ─────────────────────────────────────────────────────────────────────

interface OpsState {
  workOrders: WorkOrder[];
  requests:   OpsRequest[];
  pours:      PourEvent[];
}

type WorkerInput = { id: string; label: string; role?: string };

type OpsAction =
  | { type: "INIT_REQUESTS";    requests: OpsRequest[] }
  | { type: "APPROVE_REQUEST";   id: string }
  | {
      type:           "ASSIGN_REQUEST";
      id:             string;
      worker?:        WorkerInput;
      newWorkOrderId: string;
      createdAt:      string;
    }
  | { type: "UPDATE_WO_STATUS";  id: string; status: WorkOrderStatus }
  | { type: "CREATE_REQUEST";    request: OpsRequest }
  // Pour actions — state update only; service already persisted before dispatch
  | { type: "INIT_POURS";   pours: PourEvent[] }
  | { type: "UPSERT_POUR";  pour: PourEvent };

// ── Reducer ───────────────────────────────────────────────────────────────────

function opsReducer(state: OpsState, action: OpsAction): OpsState {
  switch (action.type) {

    case "INIT_REQUESTS": {
      return { ...state, requests: action.requests };
    }

    case "APPROVE_REQUEST": {
      const req = state.requests.find((r) => r.id === action.id);
      if (!req || !REQUEST_TRANSITIONS[req.status].includes("approved")) return state;
      return {
        ...state,
        requests: state.requests.map((r) =>
          r.id === action.id ? { ...r, status: "approved" } : r,
        ),
      };
    }

    case "ASSIGN_REQUEST": {
      const req = state.requests.find((r) => r.id === action.id);
      if (!req || !REQUEST_TRANSITIONS[req.status].includes("assigned")) return state;

      const { worker, newWorkOrderId, createdAt } = action;

      const updatedReq: OpsRequest = {
        ...req,
        status:          "assigned",
        assignedToId:    worker?.id,
        assignedToLabel: worker?.label ?? "TBD",
        assignedToRole:  worker?.role,
      };

      const newWorkOrder: WorkOrder = {
        id:              newWorkOrderId,
        createdAt,
        title:           `Dispatch: ${req.type.replace("_", " ")} — ${req.jobsite}`,
        jobsite:         req.jobsite,
        assignedToLabel: worker?.label ?? "TBD",
        assignedToId:    worker?.id,
        assignedToRole:  worker?.role,
        status:          "open",
        priority:        "medium",
        sourceType:      "request",
        sourceId:        req.id,
        sourceModule:    worker?.id ? "cru" : "ops",
      };

      return {
        requests:   state.requests.map((r) => r.id === action.id ? updatedReq : r),
        workOrders: [...state.workOrders, newWorkOrder],
        pours:      state.pours,
      };
    }

    case "CREATE_REQUEST": {
      return { ...state, requests: [...state.requests, action.request] };
    }

    case "UPDATE_WO_STATUS": {
      const wo = state.workOrders.find((w) => w.id === action.id);
      if (!wo || !WORK_ORDER_TRANSITIONS[wo.status].includes(action.status)) return state;
      return {
        ...state,
        workOrders: state.workOrders.map((w) =>
          w.id === action.id ? { ...w, status: action.status } : w,
        ),
      };
    }

    case "INIT_POURS": {
      return { ...state, pours: action.pours };
    }

    case "UPSERT_POUR": {
      const exists = state.pours.some((p) => p.id === action.pour.id);
      return {
        ...state,
        pours: exists
          ? state.pours.map((p) => (p.id === action.pour.id ? action.pour : p))
          : [...state.pours, action.pour],
      };
    }

    default:
      return state;
  }
}

const INITIAL_STATE: OpsState = {
  workOrders: [...MOCK_WORK_ORDERS],
  requests:   [], // loaded from requestsService after hydration
  pours:      [], // loaded from poursService after hydration
};

// ── Context ───────────────────────────────────────────────────────────────────

interface OpsContextValue {
  // Existing
  workOrders:            WorkOrder[];
  requests:              OpsRequest[];
  approveRequest:        (id: string) => void;
  assignRequest:         (id: string, worker?: WorkerInput) => void;
  updateWorkOrderStatus: (id: string, status: WorkOrderStatus) => void;
  createRequest:         (data: Omit<OpsRequest, "id">) => void;
  // Pours
  pours:                 PourEvent[];
  createPour:            (input: CreatePourInput, asDraft: boolean) => void;
  editPour:              (id: string, updates: Omit<CreatePourInput, "createdBy" | "createdByName">, actorRole: UserRole, actorId: string) => void;
  submitPourForApproval: (id: string, actorRole: UserRole, actorId: string) => void;
  approvePour:           (id: string, actorRole: UserRole, actorId: string, actorName: string) => void;
  rejectPour:            (id: string, reason: string, actorRole: UserRole, actorId: string, actorName: string) => void;
  cancelPour:            (id: string, reason: string, actorRole: UserRole, actorId: string, actorName: string) => void;
}

const OpsContext = createContext<OpsContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function OpsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(opsReducer, INITIAL_STATE);

  // Load pours + requests from services after hydration to avoid SSR/client mismatch
  useEffect(() => {
    dispatch({ type: "INIT_POURS",    pours:    poursService.getAllPours() });
    dispatch({ type: "INIT_REQUESTS", requests: requestsService.getAllRequests() });
  }, []);

  // Persist requests to localStorage whenever they change (after initial load)
  useEffect(() => {
    if (state.requests.length === 0) return;
    requestsService.saveAll(state.requests);
  }, [state.requests]);

  // ── Request / Work Order actions ──────────────────────────────────────────

  function approveRequest(id: string): void {
    dispatch({ type: "APPROVE_REQUEST", id });
  }

  function assignRequest(id: string, worker?: WorkerInput): void {
    dispatch({
      type:           "ASSIGN_REQUEST",
      id,
      worker,
      newWorkOrderId: crypto.randomUUID(),
      createdAt:      new Date().toISOString(),
    });
  }

  function updateWorkOrderStatus(id: string, status: WorkOrderStatus): void {
    dispatch({ type: "UPDATE_WO_STATUS", id, status });
  }

  function createRequest(data: Omit<OpsRequest, "id">): void {
    dispatch({ type: "CREATE_REQUEST", request: { ...data, id: crypto.randomUUID() } });
  }

  // ── Pour actions ──────────────────────────────────────────────────────────
  // Each function calls the service (which enforces rules + persists), then
  // dispatches to update React state. If the service returns null the action
  // was rejected by a rule — no state change happens.

  function createPour(input: CreatePourInput, asDraft: boolean): void {
    const pour = poursService.createPour(input, asDraft);
    dispatch({ type: "UPSERT_POUR", pour });
  }

  function editPour(
    id: string,
    updates: Omit<CreatePourInput, "createdBy" | "createdByName">,
    actorRole: UserRole,
    actorId: string,
  ): void {
    const pour = poursService.editPour(id, updates, actorRole, actorId);
    if (pour) dispatch({ type: "UPSERT_POUR", pour });
  }

  function submitPourForApproval(id: string, actorRole: UserRole, actorId: string): void {
    const pour = poursService.submitForApproval(id, actorRole, actorId);
    if (pour) dispatch({ type: "UPSERT_POUR", pour });
  }

  function approvePour(id: string, actorRole: UserRole, actorId: string, actorName: string): void {
    const pour = poursService.approvePour(id, actorRole, actorId, actorName);
    if (!pour) return;
    dispatch({ type: "UPSERT_POUR", pour });

    // Auto-create dispatch requests for any resource needs declared on this pour.
    // Guard against duplicates on re-approval (rejected → resubmitted → approved again).
    const alreadyCreated = state.requests.filter((r) => r.sourcePourId === id);

    if (pour.pumpRequest.requested && !alreadyCreated.some((r) => r.type === "pump_truck")) {
      dispatch({
        type: "CREATE_REQUEST",
        request: {
          id:               crypto.randomUUID(),
          type:             "pump_truck",
          jobsite:          pour.location,
          dateNeeded:       pour.date,
          notes:            pour.pumpRequest.notes ?? `Pump truck for ${pour.yardage} yd³ pour.`,
          status:           "pending",
          requestedBy:      pour.createdByName,
          requestedByUserId: pour.createdBy,
          sourcePourId:     pour.id,
        },
      });
    }

    if (pour.masonRequest.requested && !alreadyCreated.some((r) => r.type === "mason")) {
      dispatch({
        type: "CREATE_REQUEST",
        request: {
          id:               crypto.randomUUID(),
          type:             "mason",
          jobsite:          pour.location,
          dateNeeded:       pour.date,
          notes:            pour.masonRequest.notes ?? `${pour.masonRequest.masonCount ?? "?"} masons needed for pour.`,
          status:           "pending",
          requestedBy:      pour.createdByName,
          requestedByUserId: pour.createdBy,
          requestedCount:   pour.masonRequest.masonCount,
          sourcePourId:     pour.id,
        },
      });
    }
  }

  function rejectPour(
    id: string,
    reason: string,
    actorRole: UserRole,
    actorId: string,
    actorName: string,
  ): void {
    const pour = poursService.rejectPour(id, reason, actorRole, actorId, actorName);
    if (pour) dispatch({ type: "UPSERT_POUR", pour });
  }

  function cancelPour(
    id: string,
    reason: string,
    actorRole: UserRole,
    actorId: string,
    actorName: string,
  ): void {
    const pour = poursService.cancelPour(id, reason, actorRole, actorId, actorName);
    if (pour) dispatch({ type: "UPSERT_POUR", pour });
  }

  return (
    <OpsContext.Provider
      value={{
        workOrders:            state.workOrders,
        requests:              state.requests,
        approveRequest,
        assignRequest,
        updateWorkOrderStatus,
        createRequest,
        pours:                 state.pours,
        createPour,
        editPour,
        submitPourForApproval,
        approvePour,
        rejectPour,
        cancelPour,
      }}
    >
      {children}
    </OpsContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useOps(): OpsContextValue {
  const ctx = useContext(OpsContext);
  if (!ctx) throw new Error("useOps must be used within OpsProvider");
  return ctx;
}
