/**
 * MX Readiness — pure derivation helpers
 *
 * These functions are intentionally side-effect-free so they can be imported
 * by OPS surfaces (or any other consumer) without pulling in MX state.
 *
 * Derivation priority (highest → lowest):
 *   1. blocked            → "down"
 *   2. in_progress        → "in_shop"
 *   3. waiting_parts      → "awaiting_parts"
 *   4. scheduled          → "scheduled_service"
 *   5. open/triage/approved, priority critical/high + opsBlocking → "at_risk"
 *   6. open/triage/approved, any other               → "limited"
 *   7. no active WOs                                 → "ready"
 *
 * Phase 3: this logic can be mirrored server-side in a Supabase view or function.
 */

import type { MxWorkOrder, EquipmentReadiness, ReadinessStatus } from "./types";
import { ACTIVE_STATUSES } from "./rules";

// ── Core derivation ───────────────────────────────────────────────────────────

/** Derive readiness for a single equipment asset from its active work orders. */
export function deriveReadiness(
  equipmentId:    string,
  equipmentLabel: string,
  workOrders:     MxWorkOrder[],
): EquipmentReadiness {
  const active = workOrders.filter(
    (wo) =>
      wo.equipmentId === equipmentId &&
      ACTIVE_STATUSES.includes(wo.status),
  );

  if (active.length === 0) {
    return {
      equipmentId,
      equipmentLabel,
      status:               "ready",
      blockingWorkOrderIds: [],
      updatedAt:            new Date().toISOString(),
    };
  }

  const blockingIds = active.filter((wo) => wo.opsBlocking).map((wo) => wo.id);

  // Priority order: blocked > in_progress > waiting_parts > scheduled > open/triage/approved
  const hasBlocked       = active.some((wo) => wo.status === "blocked");
  const hasInProgress    = active.some((wo) => wo.status === "in_progress");
  const hasWaitingParts  = active.some((wo) => wo.status === "waiting_parts");
  const hasScheduled     = active.some((wo) => wo.status === "scheduled");
  const hasCriticalHigh  = active.some(
    (wo) => wo.opsBlocking && (wo.priority === "critical" || wo.priority === "high"),
  );

  let status: ReadinessStatus;
  let reason: string | undefined;

  if (hasBlocked) {
    status = "down";
    const wo = active.find((w) => w.status === "blocked")!;
    reason = `Blocked: ${wo.title}`;
  } else if (hasInProgress) {
    status = "in_shop";
    const wo = active.find((w) => w.status === "in_progress")!;
    reason = `In shop: ${wo.title}`;
  } else if (hasWaitingParts) {
    status = "awaiting_parts";
    const wo = active.find((w) => w.status === "waiting_parts")!;
    reason = `Awaiting parts: ${wo.title}`;
  } else if (hasScheduled) {
    status = "scheduled_service";
    const wo = active.find((w) => w.status === "scheduled")!;
    reason = `Scheduled: ${wo.title}`;
    if (wo.scheduledStart) {
      return {
        equipmentId,
        equipmentLabel,
        status,
        reason,
        blockingWorkOrderIds: blockingIds,
        nextAvailableAt:      wo.scheduledEnd,
        updatedAt:            new Date().toISOString(),
      };
    }
  } else if (hasCriticalHigh) {
    status = "at_risk";
    reason = `${blockingIds.length} blocking WO${blockingIds.length !== 1 ? "s" : ""} — critical/high priority`;
  } else {
    status = "limited";
    reason = `${active.length} open WO${active.length !== 1 ? "s" : ""}`;
  }

  return {
    equipmentId,
    equipmentLabel,
    status,
    reason,
    blockingWorkOrderIds: blockingIds,
    updatedAt:            new Date().toISOString(),
  };
}

/** Derive readiness for all equipment assets that appear in any work order.
 *  Returns one EquipmentReadiness per unique equipmentId found. */
export function deriveAllReadiness(workOrders: MxWorkOrder[]): EquipmentReadiness[] {
  const seen = new Map<string, string>(); // equipmentId → equipmentLabel
  for (const wo of workOrders) {
    if (wo.equipmentId && !seen.has(wo.equipmentId)) {
      seen.set(wo.equipmentId, wo.equipmentLabel ?? wo.equipmentId);
    }
  }

  return Array.from(seen.entries()).map(([id, label]) =>
    deriveReadiness(id, label, workOrders),
  );
}

/** Quick lookup: is a specific piece of equipment currently OPS-blocking? */
export function isEquipmentOpsBlocking(
  equipmentId: string,
  workOrders:  MxWorkOrder[],
): boolean {
  return workOrders.some(
    (wo) =>
      wo.equipmentId === equipmentId &&
      wo.opsBlocking &&
      ACTIVE_STATUSES.includes(wo.status),
  );
}

// ── Project-level readiness (OPS integration surface) ─────────────────────────

/**
 * Project-scoped readiness summary — consumed by OPS pour schedule and other
 * planning surfaces. Surfaces OPS-blocking signals without surfacing all
 * internal MX detail.
 */
export interface ProjectReadiness {
  /** Worst derived readiness status across OPS-blocking WOs at this project.
   *  null when there are no active OPS-blocking work orders. */
  worstStatus:      ReadinessStatus | null;
  /** Count of active, OPS-blocking work orders at this project */
  opsBlockingCount: number;
  /** IDs of those work orders — for deep-link navigation */
  opsBlockingIds:   string[];
}

/**
 * Derive equipment readiness risk for an OPS planning surface.
 *
 * Only surfaces OPS-blocking signals — maintenance activity that doesn't
 * block operations is intentionally omitted to keep OPS focus tight.
 */
export function deriveProjectReadiness(
  projectId:  string,
  workOrders: MxWorkOrder[],
): ProjectReadiness {
  const active = workOrders.filter(
    (wo) => wo.projectId === projectId && ACTIVE_STATUSES.includes(wo.status),
  );

  const blocking    = active.filter((wo) => wo.opsBlocking);
  const opsBlockingIds = blocking.map((wo) => wo.id);

  if (blocking.length === 0) {
    return { worstStatus: null, opsBlockingCount: 0, opsBlockingIds: [] };
  }

  // Worst status — derived only from OPS-blocking WOs
  let worstStatus: ReadinessStatus;
  if (blocking.some((wo) => wo.status === "blocked")) {
    worstStatus = "down";
  } else if (blocking.some((wo) => wo.status === "in_progress")) {
    worstStatus = "in_shop";
  } else if (blocking.some((wo) => wo.status === "waiting_parts")) {
    worstStatus = "awaiting_parts";
  } else if (blocking.some((wo) => wo.priority === "critical" || wo.priority === "high")) {
    worstStatus = "at_risk";
  } else {
    worstStatus = "limited";
  }

  return { worstStatus, opsBlockingCount: blocking.length, opsBlockingIds };
}
