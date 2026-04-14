"use client";

/**
 * PourInspectorPanel — OPS pour detail + workflow actions in the right-side inspector.
 *
 * Replaces the centered PourDetailModal and eliminates the view-mode switch for approvals.
 * All pour workflow actions are accessible here without leaving the pour schedule workspace.
 *
 * Used from:
 *   - OPS Pour Schedule list (row click)
 *   - OPS Pour Calendar (card click)
 */

import { useState } from "react";
import { InspectorPanel } from "@/components/ui/InspectorPanel";
import {
  POUR_STATUS_BADGE,
  canApprovePour,
  canCancelPour,
  canEditPour,
  canSubmitForApproval,
} from "@/lib/ops/pourRules";
import type { PourEvent, Request as OpsRequest } from "@/lib/ops/types";
import type { ProjectReadiness } from "@/lib/mx/readiness";
import type { UserRole } from "@/types/org";
import {
  CheckCircle, X, Clock, Droplets, Truck, Users,
  AlertTriangle, Wrench, ChevronDown, UserCheck,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PourInspectorPanelProps {
  pour:               PourEvent | null;
  /** Dispatch requests linked to this pour (already filtered to sourcePourId). */
  requests:           OpsRequest[];
  /** MX project-level readiness at this jobsite — present when pour has jobsiteId. */
  projectReadiness?:  ProjectReadiness;
  role:               UserRole;
  userId:             string;
  onClose:            () => void;
  onEdit?:            () => void;
  onSubmitForApproval:(id: string) => void;
  onApprove:          (id: string) => void;
  onReject:           (id: string, reason: string) => void;
  onCancel:           (id: string, reason: string) => void;
}

type InlineFormMode = "reject" | "cancel" | null;

// ── Component ─────────────────────────────────────────────────────────────────

export function PourInspectorPanel({
  pour,
  requests,
  projectReadiness,
  role,
  userId,
  onClose,
  onEdit,
  onSubmitForApproval,
  onApprove,
  onReject,
  onCancel,
}: PourInspectorPanelProps) {
  const [formMode,  setFormMode]  = useState<InlineFormMode>(null);
  const [reason,    setReason]    = useState("");

  const open = !!pour;

  const pumpReq  = requests.find((r) => r.type === "pump_truck");
  const masonReq = requests.find((r) => r.type === "mason");

  const hasMxRisk     = (projectReadiness?.opsBlockingCount ?? 0) > 0;
  const isTerminal    = pour?.status === "Completed" || pour?.status === "Canceled";

  // Permissions — evaluated each render when pour changes
  const showSubmit  = pour ? canSubmitForApproval(role, pour, userId) : false;
  const showApprove = pour ? (canApprovePour(role) && pour.status === "Pending Approval") : false;
  const showReject  = pour ? (canApprovePour(role) && pour.status === "Pending Approval") : false;
  const showEdit    = pour ? (onEdit && canEditPour(role, pour, userId)) : false;
  const showCancel  = pour ? canCancelPour(role, pour, userId) : false;
  const showDispatch = pour
    ? (pour.status === "Approved" || pour.status === "In Progress")
    : false;

  const hasActions = showSubmit || showApprove || showReject || showEdit || showCancel;

  function handleConfirmAction() {
    if (!pour || !formMode) return;
    if (formMode === "reject") onReject(pour.id, reason);
    if (formMode === "cancel") onCancel(pour.id, reason);
    setFormMode(null);
    setReason("");
  }

  function handleCancelForm() {
    setFormMode(null);
    setReason("");
  }

  // Reset form when panel closes
  function handleClose() {
    setFormMode(null);
    setReason("");
    onClose();
  }

  // Panel header badge
  const badge = pour ? (
    <span className={`text-[10px] font-bold uppercase tracking-widest border rounded-[var(--radius-badge)] px-1.5 py-0.5 ${POUR_STATUS_BADGE[pour.status]}`}>
      {pour.status}
    </span>
  ) : undefined;

  return (
    <InspectorPanel
      open={open}
      onClose={handleClose}
      title={pour?.location ?? ""}
      subtitle="Pour Details"
      badge={badge}
    >
      {pour && (
        <div className="px-5 py-4 space-y-5">

          {/* ── MX Readiness risk signal ─────────────────────────────────── */}
          {hasMxRisk && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg border border-status-critical/30 bg-status-critical/5 -mt-1">
              <Wrench size={13} className="text-status-critical mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-status-critical">
                  {projectReadiness!.opsBlockingCount} OPS-blocking MX WO{projectReadiness!.opsBlockingCount !== 1 ? "s" : ""} at this jobsite
                </p>
                {projectReadiness!.worstStatus && (
                  <p className="text-[10px] text-content-muted mt-0.5">
                    Equipment readiness: {projectReadiness!.worstStatus.replace(/_/g, " ")}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Conflicts warning ────────────────────────────────────────── */}
          {pour.conflicts && !isTerminal && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-status-warning/30 bg-status-warning/5 text-xs font-semibold text-status-warning -mt-1">
              <AlertTriangle size={13} />
              Potential scheduling conflict detected for this date
            </div>
          )}

          {/* ── Rejection notice ─────────────────────────────────────────── */}
          {pour.status === "Rejected" && pour.rejectionReason && (
            <div className="px-3 py-2.5 rounded-lg border border-status-error/30 bg-status-error/5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-status-error mb-0.5">Rejected</p>
              <p className="text-xs text-status-error">{pour.rejectionReason}</p>
              {pour.rejectedByName && (
                <p className="text-[10px] text-content-muted mt-0.5">by {pour.rejectedByName}</p>
              )}
            </div>
          )}

          {/* ── Cancellation notice ──────────────────────────────────────── */}
          {pour.status === "Canceled" && pour.cancellationReason && (
            <div className="px-3 py-2.5 rounded-lg border border-surface-border bg-surface-overlay">
              <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-0.5">Canceled</p>
              <p className="text-xs text-content-secondary">{pour.cancellationReason}</p>
              {pour.canceledByName && (
                <p className="text-[10px] text-content-muted mt-0.5">by {pour.canceledByName}</p>
              )}
            </div>
          )}

          {/* ── Core details ─────────────────────────────────────────────── */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-3">Details</h3>
            <div className="space-y-2.5">

              {/* Date / Time */}
              <div className="flex items-start gap-3">
                <Clock size={13} className="text-content-muted mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-content-primary">{pour.date}</p>
                  {pour.time && <p className="text-xs text-content-muted">{pour.time}</p>}
                </div>
              </div>

              {/* Pour type + yardage + duration */}
              <div className="flex items-start gap-3">
                <Droplets size={13} className="text-content-muted mt-0.5 flex-shrink-0" />
                <div className="text-xs">
                  <span className="font-semibold text-content-primary">{pour.pourType}</span>
                  <span className="text-content-muted ml-2">{pour.yardage} yd³</span>
                  {pour.estimatedDuration && (
                    <span className="text-content-muted ml-2">· ~{pour.estimatedDuration}</span>
                  )}
                </div>
              </div>

              {/* Requested by */}
              <div className="flex items-start gap-3">
                <UserCheck size={13} className="text-content-muted mt-0.5 flex-shrink-0" />
                <p className="text-xs text-content-secondary">
                  Requested by <span className="font-semibold text-content-primary">{pour.createdByName}</span>
                </p>
              </div>

              {/* Notes */}
              {pour.notes && (
                <div className="mt-1 pt-2 border-t border-surface-border">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-1">Notes</p>
                  <p className="text-xs text-content-secondary leading-relaxed">{pour.notes}</p>
                </div>
              )}
            </div>
          </section>

          {/* ── Resources ────────────────────────────────────────────────── */}
          {(pour.pumpRequest.requested || pour.masonRequest.requested) && (
            <section className="border-t border-surface-border pt-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-3">Resources</h3>
              <div className="space-y-2.5">

                {pour.pumpRequest.requested && (
                  <div className="flex items-start gap-2.5">
                    <Truck size={13} className={`flex-shrink-0 mt-0.5 ${pumpReq?.status === "assigned" ? "text-status-success" : "text-gold"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-content-secondary">
                        Pump truck
                        {pour.pumpRequest.pumpType && (
                          <span className="text-content-muted ml-1">({pour.pumpRequest.pumpType})</span>
                        )}
                      </p>
                      <DispatchStatus request={pumpReq} />
                    </div>
                  </div>
                )}

                {pour.masonRequest.requested && (
                  <div className="flex items-start gap-2.5">
                    <Users size={13} className={`flex-shrink-0 mt-0.5 ${masonReq?.status === "assigned" ? "text-status-success" : "text-content-muted"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-content-secondary">
                        Masons
                        {pour.masonRequest.masonCount && (
                          <span className="text-content-muted ml-1">×{pour.masonRequest.masonCount}</span>
                        )}
                      </p>
                      <DispatchStatus request={masonReq} />
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── Workflow actions ─────────────────────────────────────────── */}
          {(hasActions || showDispatch) && !isTerminal && (
            <section className="border-t border-surface-border pt-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-3">Actions</h3>

              {/* Inline reason form (reject / cancel) */}
              {formMode && (
                <div className="mb-3 p-3 rounded-lg border border-surface-border bg-surface-overlay space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted">
                    {formMode === "reject" ? "Rejection reason" : "Cancellation reason"}
                  </p>
                  <input
                    type="text"
                    autoFocus
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={formMode === "reject" ? "e.g. Resource conflict on that date" : "e.g. Weather conditions"}
                    className="w-full text-xs bg-surface-raised border border-surface-border rounded-lg px-3 py-1.5 text-content-primary focus:outline-none focus:border-gold"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleConfirmAction();
                      if (e.key === "Escape") handleCancelForm();
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleConfirmAction}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                        formMode === "reject"
                          ? "bg-status-error hover:bg-status-error/90 text-white"
                          : "bg-surface-border hover:bg-surface-border/80 text-content-primary"
                      }`}
                    >
                      {formMode === "reject" ? "Reject Pour" : "Confirm Cancel"}
                    </button>
                    <button
                      onClick={handleCancelForm}
                      className="text-xs text-content-muted hover:text-content-primary transition-colors"
                    >
                      Never mind
                    </button>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              {!formMode && (
                <div className="flex flex-wrap gap-2">
                  {showSubmit && (
                    <button
                      onClick={() => onSubmitForApproval(pour.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-status-warning/30 text-status-warning hover:bg-status-warning/10 transition-colors"
                    >
                      <ChevronDown size={12} />
                      Submit for Approval
                    </button>
                  )}
                  {showApprove && (
                    <button
                      onClick={() => onApprove(pour.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gold/30 text-gold hover:bg-gold/10 transition-colors"
                    >
                      <CheckCircle size={12} />
                      Approve
                    </button>
                  )}
                  {showReject && (
                    <button
                      onClick={() => setFormMode("reject")}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-status-error/30 text-status-error hover:bg-status-error/10 transition-colors"
                    >
                      <X size={12} />
                      Reject
                    </button>
                  )}
                  {showEdit && (
                    <button
                      onClick={onEdit}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-surface-border text-content-secondary hover:border-gold/30 hover:text-gold transition-colors"
                    >
                      Edit Pour
                    </button>
                  )}
                  {showCancel && (
                    <button
                      onClick={() => setFormMode("cancel")}
                      className="text-xs text-content-muted hover:text-status-error transition-colors px-1"
                    >
                      Cancel Pour
                    </button>
                  )}
                </div>
              )}
            </section>
          )}

        </div>
      )}
    </InspectorPanel>
  );
}

// ── Dispatch status display ───────────────────────────────────────────────────

const REQUEST_STATUS_STYLES: Record<string, string> = {
  pending:  "text-status-warning  border-status-warning/30  bg-status-warning/10",
  approved: "text-gold            border-gold/30            bg-gold/10",
  assigned: "text-status-success  border-status-success/30  bg-status-success/10",
};

function DispatchStatus({ request }: { request: OpsRequest | undefined }) {
  if (!request) {
    return <p className="text-[10px] text-content-muted italic">Not yet dispatched</p>;
  }
  return (
    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
      <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest border rounded-[var(--radius-badge)] px-1.5 py-0.5 ${REQUEST_STATUS_STYLES[request.status] ?? REQUEST_STATUS_STYLES.pending}`}>
        {request.status === "assigned" && <CheckCircle size={9} />}
        {request.status === "assigned"
          ? (request.assignedToLabel ?? "Assigned")
          : request.status}
      </span>
      {request.status === "assigned" && request.assignedToRole && (
        <span className="text-[10px] text-content-muted uppercase tracking-widest">
          · {request.assignedToRole}
        </span>
      )}
    </div>
  );
}
