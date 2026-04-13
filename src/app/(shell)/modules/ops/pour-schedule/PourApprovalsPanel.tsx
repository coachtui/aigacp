"use client";

/**
 * PourApprovalsPanel — the concrete operations approval hub.
 *
 * Two sections:
 *   1. Pours Pending Review   — inline approve / reject for each pending pour.
 *   2. Pour Dispatch          — pump truck + mason requests auto-created on pour
 *                               approval; approve and assign right here without
 *                               going to the general Requests page.
 *
 * The general Requests page is reserved for equipment / mechanics requests.
 */

import React, { useState } from "react";
import Link from "next/link";
import {
  getCruAvailableWorkersByRole,
  OPS_REQUEST_TO_CRU_ROLE,
} from "@/lib/integrations/cru";
import type { CruWorker } from "@/lib/integrations/cru";
import type { PourEvent, Request as OpsRequest } from "@/lib/ops/types";
import type { UserRole } from "@/types/org";
import type { MxWorkOrder } from "@/lib/mx/types";
import { POUR_STATUS_BADGE } from "@/lib/ops/pourRules";
import { deriveProjectReadiness } from "@/lib/mx/readiness";
import {
  CheckCircle, X, Clock, Droplets, Users, Truck,
  UserCheck, Loader, AlertTriangle, Wrench,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type WorkerInput = { id: string; label: string; role?: string };

interface PourApprovalsPanelProps {
  /** All pours with status Pending Approval. */
  pendingPours:     PourEvent[];
  /** Dispatch requests auto-created on pour approval (pump_truck + mason, with sourcePourId). */
  pourRequests:     OpsRequest[];
  /** All pours — needed to resolve pour context for each request. */
  allPours:         PourEvent[];
  role:             UserRole;
  userId:           string;
  userName:         string;
  cruOrgId:         string;
  onApprovePour:    (id: string) => void;
  onRejectPour:     (id: string, reason: string) => void;
  onApproveRequest: (id: string) => void;
  onAssignRequest:  (id: string, worker?: WorkerInput) => void;
  /** MX work orders — when provided, surfaces equipment readiness risk on pending pour cards. */
  mxWorkOrders?:    MxWorkOrder[];
}

// ── Request display constants ─────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  pending:  "text-status-warning  border-status-warning/30  bg-status-warning/10",
  approved: "text-gold            border-gold/30            bg-gold/10",
  assigned: "text-status-success  border-status-success/30  bg-status-success/10",
};

const TYPE_LABELS: Record<string, string> = {
  mason:      "Mason Crew",
  pump_truck: "Pump Truck",
};

// ── Component ─────────────────────────────────────────────────────────────────

export function PourApprovalsPanel({
  pendingPours,
  pourRequests,
  allPours,
  role,
  userId,
  userName,
  cruOrgId,
  onApprovePour,
  onRejectPour,
  onApproveRequest,
  onAssignRequest,
  mxWorkOrders,
}: PourApprovalsPanelProps) {

  // ── Pour reject inline state ──────────────────────────────────────────────
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  function startReject(id: string) {
    setRejectingId(id);
    setRejectReason("");
  }

  function confirmReject() {
    if (!rejectingId) return;
    onRejectPour(rejectingId, rejectReason);
    setRejectingId(null);
    setRejectReason("");
  }

  // ── Dispatch request assign state ─────────────────────────────────────────
  const [assigningReqId,  setAssigningReqId]  = useState<string | null>(null);
  const [workerOptions,   setWorkerOptions]   = useState<CruWorker[]>([]);
  const [selectedWorker,  setSelectedWorker]  = useState("");
  const [loadingWorkers,  setLoadingWorkers]  = useState(false);
  const [lastAssigned,    setLastAssigned]    = useState<string | null>(null);

  async function startAssign(req: OpsRequest) {
    setAssigningReqId(req.id);
    setLoadingWorkers(true);
    setWorkerOptions([]);
    setSelectedWorker("");
    try {
      const cruRole = OPS_REQUEST_TO_CRU_ROLE[req.type];
      const workers = await getCruAvailableWorkersByRole(cruOrgId, cruRole);
      setWorkerOptions(workers);
      setSelectedWorker(workers[0]?.id ?? "");
    } catch {
      setWorkerOptions([]);
    } finally {
      setLoadingWorkers(false);
    }
  }

  function confirmAssign(req: OpsRequest) {
    const worker = workerOptions.find((w) => w.id === selectedWorker);
    onAssignRequest(req.id, worker ? { id: worker.id, label: worker.name, role: worker.role } : undefined);
    const label = worker ? worker.name : "Unassigned";
    setLastAssigned(`${TYPE_LABELS[req.type] ?? req.type} assigned: ${label}`);
    setTimeout(() => setLastAssigned(null), 5000);
    setAssigningReqId(null);
    setWorkerOptions([]);
    setSelectedWorker("");
  }

  function cancelAssign() {
    setAssigningReqId(null);
    setWorkerOptions([]);
    setSelectedWorker("");
  }

  const hasWork = pendingPours.length > 0 || pourRequests.some((r) => r.status !== "assigned");

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Assignment success toast ────────────────────────────────────── */}
      {lastAssigned && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-[var(--radius-card)] border border-status-success/30 bg-status-success/5 text-sm text-status-success">
          <CheckCircle size={14} />
          <span className="font-medium">{lastAssigned}</span>
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────────── */}
      {!hasWork && (
        <div className="bg-surface-raised border border-surface-border rounded-[var(--radius-card)] px-5 py-10 text-center shadow-[var(--shadow-card)]">
          <CheckCircle size={24} className="text-status-success mx-auto mb-3" />
          <p className="text-sm font-semibold text-content-primary">All caught up</p>
          <p className="text-xs text-content-muted mt-1">No pours pending review and no open dispatch requests.</p>
        </div>
      )}

      {/* ── Section 1: Pours pending review ─────────────────────────────── */}
      {pendingPours.length > 0 && (
        <div>
          <SectionHeader
            title="Pours Pending Review"
            count={pendingPours.length}
            badge="warning"
          />
          <div className="space-y-3">
            {pendingPours.map((pour) => {
              const isRejecting = rejectingId === pour.id;

              return (
                <div
                  key={pour.id}
                  className="bg-surface-raised border border-surface-border rounded-[var(--radius-card)] px-5 py-4 shadow-[var(--shadow-card)]"
                >
                  <div className="flex items-start justify-between gap-4">

                    {/* Left: pour summary */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-semibold text-content-primary truncate">
                          {pour.location}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-widest border rounded-[var(--radius-badge)] px-1.5 py-0.5 shrink-0 ${POUR_STATUS_BADGE[pour.status]}`}>
                          {pour.status}
                        </span>
                        {pour.conflicts && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest border border-status-warning/30 bg-status-warning/10 text-status-warning rounded-[var(--radius-badge)] px-1.5 py-0.5 shrink-0">
                            <AlertTriangle size={9} /> Conflict
                          </span>
                        )}
                        {/* MX site readiness — only shown when OPS-blocking WOs exist */}
                        {mxWorkOrders && pour.jobsiteId && (() => {
                          const pr = deriveProjectReadiness(pour.jobsiteId, mxWorkOrders);
                          if (pr.opsBlockingCount === 0) return null;
                          return (
                            <Link
                              href="/modules/mx/readiness"
                              className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest border border-status-critical/30 bg-status-critical/10 text-status-critical rounded-[var(--radius-badge)] px-1.5 py-0.5 shrink-0 hover:bg-status-critical/15 transition-colors"
                              title="Active OPS-blocking MX work orders at this site"
                            >
                              <Wrench size={9} />
                              Blocking MX Issues · {pr.opsBlockingCount} WO{pr.opsBlockingCount !== 1 ? "s" : ""}
                            </Link>
                          );
                        })()}
                      </div>

                      <div className="flex items-center gap-3 flex-wrap text-xs text-content-secondary mt-1">
                        <span className="inline-flex items-center gap-1">
                          <Clock size={11} className="text-content-muted" />
                          {pour.date} · {pour.time}
                        </span>
                        <span>{pour.pourType}</span>
                        <span className="font-semibold text-content-primary">
                          {pour.yardage} <span className="font-normal text-content-muted">yd³</span>
                        </span>
                        {pour.estimatedDuration && (
                          <span className="text-content-muted">~{pour.estimatedDuration}</span>
                        )}
                      </div>

                      {/* Resource needs */}
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {pour.pumpRequest.requested && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-content-secondary">
                            <Truck size={11} className="text-gold" />
                            Pump
                            {pour.pumpRequest.pumpType && (
                              <span className="text-content-muted">({pour.pumpRequest.pumpType})</span>
                            )}
                          </span>
                        )}
                        {pour.masonRequest.requested && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-content-secondary">
                            <Users size={11} className="text-content-muted" />
                            {pour.masonRequest.masonCount ?? "?"} masons
                          </span>
                        )}
                        {!pour.pumpRequest.requested && !pour.masonRequest.requested && (
                          <span className="text-[10px] text-content-muted">No resource requests</span>
                        )}
                      </div>

                      {pour.notes && (
                        <p className="text-xs text-content-muted italic mt-2 leading-relaxed">{pour.notes}</p>
                      )}

                      <p className="text-[10px] text-content-muted mt-2">
                        Submitted by <span className="text-content-secondary">{pour.createdByName}</span>
                      </p>
                    </div>

                    {/* Right: approve / reject actions */}
                    {!isRejecting && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => startReject(pour.id)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-status-error/30 text-status-error hover:bg-status-error/10 transition-colors"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => onApprovePour(pour.id)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gold/30 text-gold hover:bg-gold/10 transition-colors"
                        >
                          Approve
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Inline reject form */}
                  {isRejecting && (
                    <div className="mt-3 pt-3 border-t border-surface-border flex items-start gap-3 flex-wrap">
                      <div className="flex-1 min-w-[220px]">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-content-muted block mb-1">
                          Rejection reason
                        </label>
                        <input
                          type="text"
                          autoFocus
                          placeholder="e.g. Resource conflict on that date"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          className="w-full text-xs bg-surface-overlay border border-surface-border rounded-lg px-3 py-1.5 text-content-primary focus:outline-none focus:border-gold"
                        />
                      </div>
                      <div className="flex items-end gap-2 pb-0.5">
                        <button
                          onClick={confirmReject}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-status-error hover:bg-status-error/90 text-white transition-colors"
                        >
                          Reject Pour
                        </button>
                        <button
                          onClick={() => { setRejectingId(null); setRejectReason(""); }}
                          className="text-xs text-content-muted hover:text-content-primary transition-colors"
                        >
                          Never mind
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Section 2: Pour dispatch requests ───────────────────────────── */}
      {(() => {
        const open = pourRequests.filter((r) => r.status !== "assigned");
        const done = pourRequests.filter((r) => r.status === "assigned");
        if (pourRequests.length === 0) return null;

        return (
          <div>
            <SectionHeader
              title="Pour Dispatch"
              count={open.length}
              badge={open.length > 0 ? "warning" : "success"}
              subtitle="Pump trucks and mason crews for approved pours"
            />
            <div className="space-y-3">
              {[...open, ...done].map((req) => {
                const sourcePour   = allPours.find((p) => p.id === req.sourcePourId);
                const isAssigning  = assigningReqId === req.id;
                const canApprove   = req.status === "pending";
                const canAssign    = req.status === "approved";

                return (
                  <div
                    key={req.id}
                    className="bg-surface-raised border border-surface-border rounded-[var(--radius-card)] px-5 py-4 shadow-[var(--shadow-card)]"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: request details */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-surface-overlay border border-surface-border flex items-center justify-center shrink-0 mt-0.5">
                          {req.type === "pump_truck"
                            ? <Truck  size={14} className="text-content-muted" />
                            : <Users  size={14} className="text-content-muted" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="text-sm font-semibold text-content-primary">
                              {TYPE_LABELS[req.type] ?? req.type}
                            </span>
                            <span className={`text-[10px] font-bold uppercase tracking-widest border rounded-[var(--radius-badge)] px-1.5 py-0.5 ${STATUS_STYLES[req.status]}`}>
                              {req.status}
                            </span>
                          </div>

                          <p className="text-xs text-content-secondary truncate">
                            {req.jobsite}
                          </p>

                          <p className="text-xs text-content-muted mt-0.5">
                            Needed: {req.dateNeeded}
                            {sourcePour && (
                              <span className="ml-1.5 text-content-muted">
                                · Pour: <span className="text-content-secondary">{sourcePour.pourType} · {sourcePour.yardage} yd³</span>
                              </span>
                            )}
                          </p>

                          {req.notes && (
                            <p className="text-xs text-content-muted mt-1.5 italic leading-relaxed">
                              {req.notes}
                            </p>
                          )}

                          {/* Assigned worker */}
                          {req.status === "assigned" && req.assignedToLabel && (
                            <div className="flex items-center gap-1.5 mt-2">
                              <UserCheck size={12} className="text-status-success" />
                              <span className="text-xs text-status-success font-medium">
                                {req.assignedToLabel}
                              </span>
                              {req.assignedToRole && (
                                <span className="text-[10px] text-content-muted uppercase tracking-widest">
                                  · {req.assignedToRole}
                                </span>
                              )}
                              {req.assignedToId?.startsWith("cru_") && (
                                <span className="text-[10px] font-bold text-gold border border-gold/30 bg-gold/10 rounded-[var(--radius-badge)] px-1 py-0.5 uppercase tracking-widest">
                                  CRU
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: action buttons */}
                      {!isAssigning && (canApprove || canAssign) && (
                        <div className="flex items-center gap-2 shrink-0">
                          {canApprove && (
                            <button
                              onClick={() => onApproveRequest(req.id)}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gold/30 text-gold hover:bg-gold/10 transition-colors"
                            >
                              Approve
                            </button>
                          )}
                          {canAssign && (
                            <button
                              onClick={() => startAssign(req)}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gold hover:bg-gold-hover text-content-inverse transition-colors"
                            >
                              Assign
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Inline CRU worker selector */}
                    {isAssigning && (
                      <div className="mt-3 pt-3 border-t border-surface-border">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-2">
                          Select from CRU
                          <span className="ml-1.5 font-normal normal-case">
                            · {OPS_REQUEST_TO_CRU_ROLE[req.type]}s available
                          </span>
                        </p>
                        {loadingWorkers ? (
                          <div className="flex items-center gap-2 text-xs text-content-muted">
                            <Loader size={12} className="animate-spin" /> Loading workers…
                          </div>
                        ) : workerOptions.length === 0 ? (
                          <p className="text-xs text-content-muted italic">
                            No available workers in CRU for this role.
                          </p>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              className="flex-1 min-w-[180px] text-xs bg-surface-overlay border border-surface-border rounded-lg px-2 py-1.5 text-content-secondary focus:outline-none focus:border-gold cursor-pointer"
                              value={selectedWorker}
                              onChange={(e) => setSelectedWorker(e.target.value)}
                            >
                              {workerOptions.map((w) => (
                                <option key={w.id} value={w.id}>
                                  {w.name}{w.siteName ? ` · ${w.siteName}` : ""}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => confirmAssign(req)}
                              disabled={!selectedWorker}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gold hover:bg-gold-hover text-content-inverse transition-colors disabled:opacity-40"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={cancelAssign}
                              className="text-xs text-content-muted hover:text-content-primary transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({
  title,
  count,
  badge,
  subtitle,
}: {
  title:    string;
  count:    number;
  badge:    "warning" | "success" | "neutral";
  subtitle?: string;
}) {
  const countStyle =
    badge === "warning" ? "border-status-warning/30 bg-status-warning/10 text-status-warning" :
    badge === "success" ? "border-status-success/30 bg-status-success/10 text-status-success" :
    "border-surface-border bg-surface-overlay text-content-muted";

  return (
    <div className="flex items-baseline gap-2 mb-3">
      <span className="text-xs font-bold text-content-primary">{title}</span>
      <span className={`text-[10px] font-bold uppercase tracking-widest border rounded-[var(--radius-badge)] px-1.5 py-0.5 ${countStyle}`}>
        {count}
      </span>
      {subtitle && (
        <span className="text-[10px] text-content-muted ml-1">{subtitle}</span>
      )}
    </div>
  );
}
