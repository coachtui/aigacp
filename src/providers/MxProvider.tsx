"use client";

/**
 * MxProvider — Maintenance Execution session state
 *
 * Follows the OpsProvider pattern: createContext + useReducer + custom hook.
 * Lives at shell layout level so state persists across MX sub-page navigations.
 *
 * Phase 3 migration: swap workOrdersService load/persist for Supabase calls.
 *
 * Responsibilities:
 *   - MX work orders (CRUD + status transitions)
 *   - Mechanic assignment / unassignment
 *   - Derived equipment readiness (computed via readiness.ts — not stored)
 *
 * NOT responsible for:
 *   - CRU data fetching (stays in src/lib/integrations/cru.ts)
 *   - Persistence implementation (delegated to workOrdersService)
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useMemo,
} from "react";
import * as workOrdersService from "@/lib/mx/workOrdersService";
import { deriveAllReadiness } from "@/lib/mx/readiness";
import { WO_TRANSITIONS } from "@/lib/mx/rules";
import type {
  MxWorkOrder,
  MxWorkOrderStatus,
  CreateMxWorkOrderInput,
  MxWorkOrderUpdate,
  EquipmentReadiness,
} from "@/lib/mx/types";

// ── State ─────────────────────────────────────────────────────────────────────

interface MxState {
  workOrders: MxWorkOrder[];
}

type MxAction =
  | { type: "INIT_WORK_ORDERS"; workOrders: MxWorkOrder[] }
  | { type: "UPSERT_WORK_ORDER"; workOrder: MxWorkOrder }
  | { type: "CREATE_WORK_ORDER"; workOrder: MxWorkOrder };

// ── Reducer ───────────────────────────────────────────────────────────────────

function mxReducer(state: MxState, action: MxAction): MxState {
  switch (action.type) {
    case "INIT_WORK_ORDERS":
      return { workOrders: action.workOrders };

    case "CREATE_WORK_ORDER":
      return { workOrders: [...state.workOrders, action.workOrder] };

    case "UPSERT_WORK_ORDER": {
      const exists = state.workOrders.some((w) => w.id === action.workOrder.id);
      return {
        workOrders: exists
          ? state.workOrders.map((w) =>
              w.id === action.workOrder.id ? action.workOrder : w,
            )
          : [...state.workOrders, action.workOrder],
      };
    }

    default:
      return state;
  }
}

const INITIAL_STATE: MxState = { workOrders: [] };

// ── Context ───────────────────────────────────────────────────────────────────

interface MxContextValue {
  workOrders:            MxWorkOrder[];
  readiness:             EquipmentReadiness[];
  createWorkOrder:       (input: CreateMxWorkOrderInput) => MxWorkOrder;
  updateWorkOrderStatus: (id: string, status: MxWorkOrderStatus) => void;
  updateWorkOrder:       (id: string, updates: MxWorkOrderUpdate) => void;
  assignMechanic:        (workOrderId: string, mechanicId: string) => void;
  unassignMechanic:      (workOrderId: string, mechanicId: string) => void;
}

const MxContext = createContext<MxContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function MxProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(mxReducer, INITIAL_STATE);

  // Load from localStorage after hydration to avoid SSR/client mismatch
  useEffect(() => {
    dispatch({
      type:       "INIT_WORK_ORDERS",
      workOrders: workOrdersService.getAllWorkOrders(),
    });
  }, []);

  // Derived readiness — recomputed whenever work orders change
  const readiness = useMemo(
    () => deriveAllReadiness(state.workOrders),
    [state.workOrders],
  );

  // ── Actions ───────────────────────────────────────────────────────────────

  function createWorkOrder(input: CreateMxWorkOrderInput): MxWorkOrder {
    const wo = workOrdersService.createWorkOrder(input);
    dispatch({ type: "CREATE_WORK_ORDER", workOrder: wo });
    return wo;
  }

  function updateWorkOrderStatus(id: string, status: MxWorkOrderStatus): void {
    const wo = state.workOrders.find((w) => w.id === id);
    if (!wo) return;
    if (!WO_TRANSITIONS[wo.status].includes(status)) return; // guard invalid transition

    const updated = workOrdersService.updateWorkOrderStatus(id, status);
    if (updated) dispatch({ type: "UPSERT_WORK_ORDER", workOrder: updated });
  }

  function assignMechanic(workOrderId: string, mechanicId: string): void {
    const updated = workOrdersService.assignMechanic(workOrderId, mechanicId);
    if (updated) dispatch({ type: "UPSERT_WORK_ORDER", workOrder: updated });
  }

  function updateWorkOrder(id: string, updates: MxWorkOrderUpdate): void {
    const updated = workOrdersService.updateWorkOrder(id, updates);
    if (updated) dispatch({ type: "UPSERT_WORK_ORDER", workOrder: updated });
  }

  function unassignMechanic(workOrderId: string, mechanicId: string): void {
    const updated = workOrdersService.unassignMechanic(workOrderId, mechanicId);
    if (updated) dispatch({ type: "UPSERT_WORK_ORDER", workOrder: updated });
  }

  return (
    <MxContext.Provider
      value={{
        workOrders:            state.workOrders,
        readiness,
        createWorkOrder,
        updateWorkOrderStatus,
        updateWorkOrder,
        assignMechanic,
        unassignMechanic,
      }}
    >
      {children}
    </MxContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useMx(): MxContextValue {
  const ctx = useContext(MxContext);
  if (!ctx) throw new Error("useMx must be used within MxProvider");
  return ctx;
}
