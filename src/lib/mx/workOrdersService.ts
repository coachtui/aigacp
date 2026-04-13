/**
 * MX Work Orders Service — localStorage-backed repository
 *
 * Persistence seam: replace load() / persist() with Supabase client calls
 * to migrate to Phase 3. No page components need to change.
 *
 * WO number sequence is persisted separately so numbers are never reused
 * even if individual work orders are deleted.
 */

import type { MxWorkOrder, CreateMxWorkOrderInput, MxWorkOrderUpdate } from "./types";
import { MOCK_MX_WORK_ORDERS, INITIAL_WO_COUNTER } from "./mock-data";

const STORAGE_KEY   = "aigacp:mx:work-orders";
const COUNTER_KEY   = "aigacp:mx:wo-counter";

// ── Persistence ───────────────────────────────────────────────────────────────

function load(): MxWorkOrder[] {
  if (typeof window === "undefined") return [...MOCK_MX_WORK_ORDERS];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...MOCK_MX_WORK_ORDERS];
    return JSON.parse(raw) as MxWorkOrder[];
  } catch {
    return [...MOCK_MX_WORK_ORDERS];
  }
}

function persist(workOrders: MxWorkOrder[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workOrders));
}

function nextCounter(): number {
  if (typeof window === "undefined") return INITIAL_WO_COUNTER;
  try {
    const raw = localStorage.getItem(COUNTER_KEY);
    const n   = raw ? parseInt(raw, 10) : INITIAL_WO_COUNTER;
    localStorage.setItem(COUNTER_KEY, String(n + 1));
    return n;
  } catch {
    return INITIAL_WO_COUNTER;
  }
}

function formatWoNumber(n: number): string {
  return `WO-${String(n).padStart(4, "0")}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getAllWorkOrders(): MxWorkOrder[] {
  return load();
}

export function getWorkOrderById(id: string): MxWorkOrder | undefined {
  return load().find((wo) => wo.id === id);
}

export function createWorkOrder(input: CreateMxWorkOrderInput): MxWorkOrder {
  const workOrders = load();
  const now        = new Date().toISOString();
  const n          = nextCounter();

  const wo: MxWorkOrder = {
    id:                  crypto.randomUUID(),
    woNumber:            formatWoNumber(n),
    title:               input.title,
    description:         input.description,
    category:            input.category,
    priority:            input.priority,
    status:              "open",
    sourceType:          "manual",
    equipmentId:         input.equipmentId,
    equipmentLabel:      input.equipmentLabel,
    projectId:           input.projectId,
    projectName:         input.projectName,
    requestedBy:         input.requestedBy,
    requestedByUserId:   input.requestedByUserId,
    requestedDate:       input.requestedDate,
    neededByDate:        input.neededByDate,
    readinessImpact:     input.readinessImpact,
    opsBlocking:         input.opsBlocking,
    assignedMechanicIds: [],
    createdAt:           now,
    updatedAt:           now,
  };

  persist([...workOrders, wo]);
  return wo;
}

export function updateWorkOrderStatus(
  id:     string,
  status: MxWorkOrder["status"],
): MxWorkOrder | null {
  const workOrders = load();
  const idx        = workOrders.findIndex((wo) => wo.id === id);
  if (idx === -1) return null;

  const now      = new Date().toISOString();
  const existing = workOrders[idx];

  const timestamps: Partial<Pick<MxWorkOrder, "actualStart" | "actualEnd">> = {};
  // Set actualStart on first transition to in_progress (don't overwrite a restart)
  if (status === "in_progress" && !existing.actualStart) {
    timestamps.actualStart = now;
  }
  // Always set actualEnd when work is completed
  if (status === "completed") {
    timestamps.actualEnd = now;
  }

  const updated: MxWorkOrder = {
    ...existing,
    ...timestamps,
    status,
    updatedAt: now,
  };
  workOrders[idx] = updated;
  persist(workOrders);
  return updated;
}

export function assignMechanic(
  workOrderId: string,
  mechanicId:  string,
): MxWorkOrder | null {
  const workOrders = load();
  const idx        = workOrders.findIndex((wo) => wo.id === workOrderId);
  if (idx === -1) return null;

  const wo = workOrders[idx];
  if (wo.assignedMechanicIds.includes(mechanicId)) return wo; // already assigned

  const updated: MxWorkOrder = {
    ...wo,
    assignedMechanicIds: [...wo.assignedMechanicIds, mechanicId],
    updatedAt:           new Date().toISOString(),
  };
  workOrders[idx] = updated;
  persist(workOrders);
  return updated;
}

export function unassignMechanic(
  workOrderId: string,
  mechanicId:  string,
): MxWorkOrder | null {
  const workOrders = load();
  const idx        = workOrders.findIndex((wo) => wo.id === workOrderId);
  if (idx === -1) return null;

  const updated: MxWorkOrder = {
    ...workOrders[idx],
    assignedMechanicIds: workOrders[idx].assignedMechanicIds.filter(
      (id) => id !== mechanicId,
    ),
    updatedAt: new Date().toISOString(),
  };
  workOrders[idx] = updated;
  persist(workOrders);
  return updated;
}

export function updateWorkOrder(
  id:      string,
  updates: MxWorkOrderUpdate,
): MxWorkOrder | null {
  const workOrders = load();
  const idx        = workOrders.findIndex((wo) => wo.id === id);
  if (idx === -1) return null;

  const updated: MxWorkOrder = {
    ...workOrders[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  workOrders[idx] = updated;
  persist(workOrders);
  return updated;
}

export function saveAll(workOrders: MxWorkOrder[]): void {
  persist(workOrders);
}
