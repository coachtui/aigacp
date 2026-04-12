"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { getCruSiteEventsForOrg } from "@/lib/integrations/cru";
import type { CruSiteEvent } from "@/lib/integrations/cru";
import { useOrg } from "@/providers/OrgProvider";
import { useOps } from "@/providers/OpsProvider";
import type { PourEvent, Request as OpsRequest } from "@/lib/ops/types";
import {
  POUR_STATUS_BADGE,
  canCreatePour,
  canApprovePour,
  canCancelPour,
  canEditPour,
  canSubmitForApproval,
} from "@/lib/ops/pourRules";
import { CreatePourModal } from "./CreatePourModal";
import {
  ArrowLeft, AlertTriangle, CheckCircle, Droplets,
  Loader, Truck, Users, Plus, Clock, X, ChevronDown,
} from "lucide-react";

// ── CRU status display (legacy — CRU has its own simpler status model) ────────

const CRU_STATUS_BADGE: Record<string, string> = {
  planned:   "text-content-muted   border-surface-border    bg-surface-overlay",
  confirmed: "text-gold            border-gold/30           bg-gold/10",
  completed: "text-status-success  border-status-success/30 bg-status-success/10",
};

// Date range for CRU query — same as before
const CRU_QUERY_START = "2026-04-01";
const CRU_QUERY_END   = "2026-04-30";

// ── Inline action state ───────────────────────────────────────────────────────

type InlineAction =
  | { type: "reject"; pourId: string; reason: string }
  | { type: "cancel"; pourId: string; reason: string }
  | null;

// ── Modal state ───────────────────────────────────────────────────────────────

type ModalState =
  | { mode: "create" }
  | { mode: "edit"; pour: PourEvent }
  | null;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PourSchedulePage() {
  const { currentOrganization, currentUser, role } = useOrg();
  const {
    pours,
    requests,
    createRequest,
    createPour,
    editPour,
    submitPourForApproval,
    approvePour,
    rejectPour,
    cancelPour,
  } = useOps();

  const cruOrgId = currentOrganization.cruOrgId ?? currentOrganization.id;

  // ── CRU events (preserved existing behavior) ───────────────────────────────
  const [cruEvents,   setCruEvents]   = useState<CruSiteEvent[]>([]);
  const [loadingCru,  setLoadingCru]  = useState(true);
  const [cruError,    setCruError]    = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCruSiteEventsForOrg(cruOrgId, CRU_QUERY_START, CRU_QUERY_END, "pour")
      .then((data) => { if (!cancelled) setCruEvents(data); })
      .catch(() => { if (!cancelled) setCruError(true); })
      .finally(() => { if (!cancelled) setLoadingCru(false); });
    return () => { cancelled = true; };
  }, [cruOrgId]);

  // ── Request dispatch state (preserved existing behavior) ──────────────────
  const [masonPickerRowId, setMasonPickerRowId] = useState<string | null>(null);
  const [masonQty,         setMasonQty]         = useState(4);
  const [confirmedRows,    setConfirmedRows]     = useState<Record<string, Set<"pump" | "mason">>>({});

  // ── Workflow UI state ─────────────────────────────────────────────────────
  const [inlineAction, setInlineAction] = useState<InlineAction>(null);
  const [modal,        setModal]        = useState<ModalState>(null);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const activePours    = pours.filter((p) => p.status !== "Completed" && p.status !== "Canceled");
  const totalYardage   = activePours.reduce((s, p) => s + p.yardage, 0);
  const pendingCount   = pours.filter((p) => p.status === "Pending Approval").length;
  const pumpCount      = activePours.filter((p) => p.pumpRequest.requested).length;
  const conflictCount  = pours.filter((p) => p.conflicts && p.status !== "Canceled" && p.status !== "Completed").length;
  const cruCount       = cruEvents.length;

  // ── Sorted pours (newest/soonest first; completed last) ───────────────────
  const sortedPours = useMemo(() => {
    return [...pours].sort((a, b) => {
      const aTerminal = a.status === "Completed" || a.status === "Canceled";
      const bTerminal = b.status === "Completed" || b.status === "Canceled";
      if (aTerminal !== bTerminal) return aTerminal ? 1 : -1;
      return a.date.localeCompare(b.date);
    });
  }, [pours]);

  // ── Dispatch request helpers (preserved from original page) ───────────────

  function hasPendingDispatchRequest(jobsite: string, date: string, type: "pump_truck" | "mason"): boolean {
    return requests.some((r) => r.type === type && r.jobsite === jobsite && r.dateNeeded === date);
  }

  function handleRequestPump(jobsite: string, date: string, yardage: number, rowId: string) {
    createRequest({
      type:        "pump_truck",
      jobsite,
      dateNeeded:  date,
      notes:       `Pump truck needed for ${yardage} yd³ pour.`,
      status:      "pending",
      requestedBy: currentOrganization.name,
    });
    markConfirmed(rowId, "pump");
  }

  function handleConfirmMasons(jobsite: string, date: string, yardage: number, rowId: string) {
    createRequest({
      type:           "mason",
      jobsite,
      dateNeeded:     date,
      notes:          `${masonQty} masons requested for pour (${yardage} yd³).`,
      status:         "pending",
      requestedBy:    currentOrganization.name,
      requestedCount: masonQty,
    });
    setMasonPickerRowId(null);
    markConfirmed(rowId, "mason");
  }

  function markConfirmed(rowId: string, type: "pump" | "mason") {
    setConfirmedRows((prev) => {
      const next = new Set(prev[rowId] ?? []) as Set<"pump" | "mason">;
      next.add(type);
      return { ...prev, [rowId]: next };
    });
    setTimeout(() => {
      setConfirmedRows((prev) => {
        const next = new Set(prev[rowId]);
        next.delete(type);
        return { ...prev, [rowId]: next };
      });
    }, 4000);
  }

  // ── Pour workflow handlers ────────────────────────────────────────────────

  function handleSubmitForApproval(id: string) {
    submitPourForApproval(id, role, currentUser.id);
  }

  function handleApprove(id: string) {
    approvePour(id, role, currentUser.id, currentUser.name);
  }

  function handleRejectConfirm() {
    if (!inlineAction || inlineAction.type !== "reject") return;
    rejectPour(inlineAction.pourId, inlineAction.reason, role, currentUser.id, currentUser.name);
    setInlineAction(null);
  }

  function handleCancelConfirm() {
    if (!inlineAction || inlineAction.type !== "cancel") return;
    cancelPour(inlineAction.pourId, inlineAction.reason, role, currentUser.id, currentUser.name);
    setInlineAction(null);
  }

  // ── Create / Edit modal handlers ──────────────────────────────────────────

  function handleModalSubmit(input: import("@/lib/ops/types").CreatePourInput, asDraft: boolean) {
    if (modal?.mode === "edit") {
      editPour(modal.pour.id, input, role, currentUser.id);
    } else {
      createPour({ ...input, createdBy: currentUser.id, createdByName: currentUser.name }, asDraft);
    }
    setModal(null);
  }

  const userCanCreate = canCreatePour(role);

  return (
    <PageContainer maxWidth="wide">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/modules/ops"
            className="text-content-muted hover:text-content-primary transition-colors"
            aria-label="Back to OPS"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-content-primary">Pour Schedule</h1>
            <p className="text-xs text-content-muted">
              {loadingCru ? (
                <span className="inline-flex items-center gap-1">
                  <Loader size={10} className="animate-spin" /> Loading CRU events…
                </span>
              ) : cruError ? (
                <>{pours.length} pours · <span className="text-status-warning">CRU unavailable</span></>
              ) : (
                <>
                  {pours.length} pours
                  {cruCount > 0 && <> · <span className="text-gold">{cruCount} from CRU</span></>}
                </>
              )}
            </p>
          </div>
        </div>

        {userCanCreate && (
          <button
            onClick={() => setModal({ mode: "create" })}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gold hover:bg-gold-hover text-content-inverse transition-colors"
          >
            <Plus size={13} />
            Create Pour
          </button>
        )}
      </div>

      {/* ── Summary bar ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-surface-raised border border-surface-border rounded-[var(--radius-card)] px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-1">Upcoming Yardage</p>
          <p className="text-xl font-bold text-content-primary">
            {totalYardage} <span className="text-sm font-normal text-content-muted">yd³</span>
          </p>
        </div>
        <div className="bg-surface-raised border border-surface-border rounded-[var(--radius-card)] px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-1">Pump Required</p>
          <p className="text-xl font-bold text-content-primary">
            {pumpCount}<span className="text-sm font-normal text-content-muted"> pours</span>
          </p>
        </div>
        {canApprovePour(role) && (
          <div className={`bg-surface-raised border rounded-[var(--radius-card)] px-4 py-3 ${
            pendingCount > 0 ? "border-status-warning/40" : "border-surface-border"
          }`}>
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${
              pendingCount > 0 ? "text-status-warning" : "text-content-muted"
            }`}>Pending Approval</p>
            <p className={`text-xl font-bold ${pendingCount > 0 ? "text-status-warning" : "text-content-primary"}`}>
              {pendingCount}
            </p>
          </div>
        )}
        {conflictCount > 0 && (
          <div className="bg-surface-raised border border-status-warning/30 rounded-[var(--radius-card)] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-status-warning mb-1">Conflicts</p>
            <p className="text-xl font-bold text-status-warning">{conflictCount}</p>
          </div>
        )}
      </div>

      {/* ── OPS Pour Table ─────────────────────────────────────────────────── */}
      <div className="bg-surface-raised border border-surface-border rounded-[var(--radius-card)] overflow-hidden shadow-[var(--shadow-card)] mb-6">
        <div className="px-5 py-3 border-b border-surface-border flex items-center gap-2">
          <span className="text-xs font-bold text-content-primary">OPS Pours</span>
          <span className="text-[10px] font-bold uppercase tracking-widest border border-surface-border bg-surface-overlay text-content-muted rounded-[var(--radius-badge)] px-1.5 py-0.5">
            {pours.length}
          </span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border">
              <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted px-5 py-3">Location</th>
              <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted px-4 py-3">Date / Time</th>
              <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted px-4 py-3 hidden md:table-cell">Type</th>
              <th className="text-right text-[10px] font-bold uppercase tracking-widest text-content-muted px-4 py-3">Yardage</th>
              <th className="text-center text-[10px] font-bold uppercase tracking-widest text-content-muted px-4 py-3 hidden sm:table-cell">Resources</th>
              <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted px-4 py-3 hidden lg:table-cell">Requested By</th>
              <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted px-4 py-3">Status</th>
              <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {sortedPours.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-6 text-center text-xs text-content-muted">
                  No pours scheduled yet.
                  {userCanCreate && (
                    <button
                      onClick={() => setModal({ mode: "create" })}
                      className="ml-1 text-gold hover:underline"
                    >
                      Create the first one.
                    </button>
                  )}
                </td>
              </tr>
            )}
            {sortedPours.map((pour) => {
              const isInlineOpen = inlineAction?.pourId === pour.id;
              const pourRequests = requests.filter((r) => r.sourcePourId === pour.id);

              return (
                <React.Fragment key={pour.id}>
                  <tr className="hover:bg-surface-overlay transition-colors">

                    {/* Location */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        {pour.conflicts && (
                          <span title="Potential conflict" className="shrink-0">
                            <AlertTriangle size={13} className="text-status-warning" />
                          </span>
                        )}
                        <span className="text-content-primary font-medium text-sm truncate max-w-[180px]">
                          {pour.location}
                        </span>
                      </div>
                      {pour.status === "Rejected" && pour.rejectionReason && (
                        <p className="text-[10px] text-status-error mt-0.5 max-w-[180px] truncate" title={pour.rejectionReason}>
                          Rejected: {pour.rejectionReason}
                        </p>
                      )}
                    </td>

                    {/* Date / Time */}
                    <td className="px-4 py-3.5 text-content-secondary text-xs whitespace-nowrap">
                      <div>{pour.date}</div>
                      {pour.time && (
                        <div className="flex items-center gap-0.5 text-content-muted mt-0.5">
                          <Clock size={10} />
                          <span>{pour.time}</span>
                        </div>
                      )}
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3.5 text-content-secondary text-xs hidden md:table-cell">
                      {pour.pourType}
                    </td>

                    {/* Yardage */}
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-content-primary font-semibold text-sm">{pour.yardage}</span>
                      <span className="text-content-muted text-xs ml-1">yd³</span>
                    </td>

                    {/* Resources */}
                    <td className="px-4 py-3.5 text-center hidden sm:table-cell">
                      <div className="flex items-center justify-center gap-2">
                        {pour.pumpRequest.requested ? (
                          <span title={`Pump: ${pour.pumpRequest.pumpType ?? "TBD"}`}>
                            <Droplets size={14} className="text-gold" />
                          </span>
                        ) : (
                          <Droplets size={14} className="text-surface-border" />
                        )}
                        {pour.masonRequest.requested ? (
                          <span
                            className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-content-secondary"
                            title={`${pour.masonRequest.masonCount ?? "?"} masons`}
                          >
                            <Users size={11} />
                            {pour.masonRequest.masonCount ?? "?"}
                          </span>
                        ) : (
                          <Users size={14} className="text-surface-border" />
                        )}
                      </div>
                    </td>

                    {/* Requested By */}
                    <td className="px-4 py-3.5 text-content-secondary text-xs hidden lg:table-cell">
                      {pour.createdByName}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest border rounded-[var(--radius-badge)] px-1.5 py-0.5 ${POUR_STATUS_BADGE[pour.status]}`}
                      >
                        {pour.status === "Completed" && <CheckCircle size={10} />}
                        {pour.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <OpsActions
                        pour={pour}
                        role={role}
                        userId={currentUser.id}
                        inlineOpen={isInlineOpen}
                        pourRequests={pourRequests}
                        onSubmitForApproval={() => handleSubmitForApproval(pour.id)}
                        onApprove={() => handleApprove(pour.id)}
                        onStartReject={() => setInlineAction({ type: "reject", pourId: pour.id, reason: "" })}
                        onStartCancel={() => setInlineAction({ type: "cancel", pourId: pour.id, reason: "" })}
                        onEdit={() => setModal({ mode: "edit", pour })}
                      />
                    </td>
                  </tr>

                  {/* Inline action row */}
                  {isInlineOpen && (
                    <tr className="bg-surface-overlay">
                      <td colSpan={8} className="px-5 py-3">
                        <InlineActionForm
                          action={inlineAction!}
                          onReasonChange={(reason) =>
                            setInlineAction((prev) => prev ? { ...prev, reason } : prev)
                          }
                          onConfirm={inlineAction?.type === "reject" ? handleRejectConfirm : handleCancelConfirm}
                          onCancel={() => setInlineAction(null)}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── CRU Events Table (preserved existing display behavior) ──────────── */}
      {(cruEvents.length > 0 || loadingCru) && (
        <div className="bg-surface-raised border border-surface-border rounded-[var(--radius-card)] overflow-hidden shadow-[var(--shadow-card)]">
          <div className="px-5 py-3 border-b border-surface-border flex items-center gap-2">
            <span className="text-xs font-bold text-content-primary">CRU Events</span>
            <span className="text-[10px] font-bold uppercase tracking-widest border border-gold/30 bg-gold/10 text-gold rounded-[var(--radius-badge)] px-1.5 py-0.5">
              CRU
            </span>
            {loadingCru && <Loader size={11} className="animate-spin text-content-muted" />}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border">
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted px-5 py-3">Jobsite</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted px-4 py-3">Date</th>
                <th className="text-right text-[10px] font-bold uppercase tracking-widest text-content-muted px-4 py-3">Yardage</th>
                <th className="text-center text-[10px] font-bold uppercase tracking-widest text-content-muted px-4 py-3">Pump</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted px-4 py-3 hidden md:table-cell">Crew</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted px-4 py-3">Status</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {cruEvents.map((e) => {
                const rowId     = e.id;
                const jobsite   = e.siteName;
                const isComplete = e.status === "completed";
                return (
                  <tr key={rowId} className="hover:bg-surface-overlay transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="text-content-primary font-medium text-sm truncate max-w-[180px]">
                        {jobsite}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-content-secondary text-xs">{e.date}</td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-content-primary font-semibold text-sm">{e.yardage ?? "—"}</span>
                      {e.yardage != null && <span className="text-content-muted text-xs ml-1">yd³</span>}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {e.pumpRequired
                        ? <Droplets size={14} className="text-gold inline-block" />
                        : <span className="text-content-muted text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-content-secondary text-xs hidden md:table-cell">
                      {e.crewName ?? "TBD"}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest border rounded-[var(--radius-badge)] px-1.5 py-0.5 ${CRU_STATUS_BADGE[e.status] ?? CRU_STATUS_BADGE.planned}`}>
                        {e.status === "completed" && <CheckCircle size={10} />}
                        {e.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {isComplete ? (
                        <span className="text-xs text-content-muted">—</span>
                      ) : (
                        <CruDispatchActions
                          rowId={rowId}
                          jobsite={jobsite}
                          date={e.date}
                          yardage={e.yardage ?? 0}
                          pumpRequired={e.pumpRequired ?? false}
                          masonPickerOpen={masonPickerRowId === rowId}
                          masonQty={masonQty}
                          pumpConfirmed={confirmedRows[rowId]?.has("pump") ?? false}
                          masonConfirmed={confirmedRows[rowId]?.has("mason") ?? false}
                          hasPumpRequest={hasPendingDispatchRequest(jobsite, e.date, "pump_truck")}
                          hasMasonRequest={hasPendingDispatchRequest(jobsite, e.date, "mason")}
                          onRequestPump={() => handleRequestPump(jobsite, e.date, e.yardage ?? 0, rowId)}
                          onOpenMasonPicker={() => { setMasonPickerRowId(rowId); setMasonQty(4); }}
                          onMasonQtyChange={setMasonQty}
                          onConfirmMasons={() => handleConfirmMasons(jobsite, e.date, e.yardage ?? 0, rowId)}
                          onCancelMasonPicker={() => setMasonPickerRowId(null)}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create / Edit modal ───────────────────────────────────────────── */}
      {modal && (
        <CreatePourModal
          initialData={modal.mode === "edit" ? modal.pour : undefined}
          onClose={() => setModal(null)}
          onSubmit={handleModalSubmit}
          role={role}
          userId={currentUser.id}
        />
      )}
    </PageContainer>
  );
}

// ── OPS row actions ───────────────────────────────────────────────────────────

interface OpsActionsProps {
  pour:                PourEvent;
  role:                import("@/types/org").UserRole;
  userId:              string;
  inlineOpen:          boolean;
  /** Dispatch requests auto-created when this pour was approved (sourcePourId linkage). */
  pourRequests:        OpsRequest[];
  onSubmitForApproval: () => void;
  onApprove:           () => void;
  onStartReject:       () => void;
  onStartCancel:       () => void;
  onEdit:              () => void;
}

function OpsActions({
  pour, role, userId, inlineOpen, pourRequests,
  onSubmitForApproval, onApprove, onStartReject, onStartCancel, onEdit,
}: OpsActionsProps) {
  if (pour.status === "Completed" || pour.status === "Canceled") {
    return <span className="text-xs text-content-muted">—</span>;
  }
  if (inlineOpen) {
    return <span className="text-xs text-content-muted italic">…</span>;
  }

  const showSubmit  = canSubmitForApproval(role, pour, userId);
  const showApprove = canApprovePour(role) && pour.status === "Pending Approval";
  const showReject  = canApprovePour(role) && pour.status === "Pending Approval";
  const showEdit    = canEditPour(role, pour, userId);
  const showCancel  = canCancelPour(role, pour, userId);
  const showDispatchStatus =
    pour.status === "Approved" || pour.status === "In Progress";

  return (
    <div className="flex flex-col gap-1.5 min-w-[140px]">

      {/* Workflow actions */}
      {showSubmit && (
        <button
          onClick={onSubmitForApproval}
          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border border-status-warning/30 text-status-warning hover:bg-status-warning/10 transition-colors whitespace-nowrap"
        >
          <ChevronDown size={11} />
          Submit for Approval
        </button>
      )}
      {showApprove && (
        <button
          onClick={onApprove}
          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border border-gold/30 text-gold hover:bg-gold/10 transition-colors whitespace-nowrap"
        >
          <CheckCircle size={11} />
          Approve
        </button>
      )}
      {showReject && (
        <button
          onClick={onStartReject}
          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border border-status-error/30 text-status-error hover:bg-status-error/10 transition-colors"
        >
          <X size={11} />
          Reject
        </button>
      )}
      {showEdit && (
        <button
          onClick={onEdit}
          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border border-surface-border text-content-secondary hover:border-gold/30 hover:text-gold transition-colors"
        >
          Edit
        </button>
      )}
      {showCancel && (
        <button
          onClick={onStartCancel}
          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg text-content-muted hover:text-status-error transition-colors"
        >
          Cancel Pour
        </button>
      )}

      {/* Dispatch request status — auto-created on approval, no manual button needed */}
      {showDispatchStatus && (
        <div className="flex flex-col gap-1 mt-0.5 pt-1.5 border-t border-surface-border">
          {pour.pumpRequest.requested && (
            <DispatchStatus
              icon={<Truck size={10} />}
              label="Pump"
              request={pourRequests.find((r) => r.type === "pump_truck")}
            />
          )}
          {pour.masonRequest.requested && (
            <DispatchStatus
              icon={<Users size={10} />}
              label={`Masons${pour.masonRequest.masonCount ? ` ×${pour.masonRequest.masonCount}` : ""}`}
              request={pourRequests.find((r) => r.type === "mason")}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Dispatch status display ───────────────────────────────────────────────────

interface DispatchStatusProps {
  icon:     React.ReactNode;
  label:    string;
  request?: OpsRequest;
}

function DispatchStatus({ icon, label, request }: DispatchStatusProps) {
  if (!request) {
    return (
      <div className="flex items-center gap-1 text-[10px] text-content-muted">
        {icon}
        <span>{label}:</span>
        <span className="italic">not dispatched</span>
      </div>
    );
  }

  const styles: Record<string, string> = {
    pending:  "text-status-warning  border-status-warning/30  bg-status-warning/10",
    approved: "text-gold            border-gold/30            bg-gold/10",
    assigned: "text-status-success  border-status-success/30  bg-status-success/10",
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="inline-flex items-center gap-1 text-[10px] text-content-muted">
        {icon}
        {label}:
      </span>
      <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest border rounded-[var(--radius-badge)] px-1.5 py-0.5 ${styles[request.status] ?? styles.pending}`}>
        {request.status === "assigned" && <CheckCircle size={9} />}
        {request.status === "assigned"
          ? (request.assignedToLabel ?? "Assigned")
          : request.status}
      </span>
    </div>
  );
}

// ── CRU dispatch actions (extracted, same as original) ────────────────────────

interface CruDispatchActionsProps {
  rowId:              string;
  jobsite:            string;
  date:               string;
  yardage:            number;
  pumpRequired:       boolean;
  masonPickerOpen:    boolean;
  masonQty:           number;
  pumpConfirmed:      boolean;
  masonConfirmed:     boolean;
  hasPumpRequest:     boolean;
  hasMasonRequest:    boolean;
  onRequestPump:      () => void;
  onOpenMasonPicker:  () => void;
  onMasonQtyChange:   (v: number) => void;
  onConfirmMasons:    () => void;
  onCancelMasonPicker:() => void;
}

function CruDispatchActions({
  pumpRequired, masonPickerOpen, masonQty, pumpConfirmed, masonConfirmed,
  hasPumpRequest, hasMasonRequest,
  onRequestPump, onOpenMasonPicker, onMasonQtyChange, onConfirmMasons, onCancelMasonPicker,
}: CruDispatchActionsProps) {
  return (
    <div className="flex flex-col gap-1.5 min-w-[140px]">
      {pumpRequired && (
        hasPumpRequest || pumpConfirmed ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-gold border border-gold/30 bg-gold/10 rounded-[var(--radius-badge)] px-1.5 py-0.5">
            <CheckCircle size={9} /> Pump requested
          </span>
        ) : (
          <button
            onClick={onRequestPump}
            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border border-gold/30 text-gold hover:bg-gold/10 transition-colors whitespace-nowrap"
          >
            <Truck size={11} /> Request Pump
          </button>
        )
      )}
      {masonPickerOpen ? (
        <div className="flex items-center gap-1.5 flex-wrap">
          <input
            type="number" min={1} max={20} value={masonQty}
            onChange={(e) => onMasonQtyChange(Math.max(1, Math.min(20, Number(e.target.value))))}
            className="w-14 text-xs bg-surface-overlay border border-surface-border rounded-lg px-2 py-1 text-content-primary focus:outline-none focus:border-gold"
          />
          <span className="text-[10px] text-content-muted">masons</span>
          <button
            onClick={onConfirmMasons}
            className="text-xs font-semibold px-2 py-1 rounded-lg bg-gold hover:bg-gold-hover text-content-inverse transition-colors"
          >
            Confirm
          </button>
          <button onClick={onCancelMasonPicker} className="text-xs text-content-muted hover:text-content-primary transition-colors">
            Cancel
          </button>
        </div>
      ) : hasMasonRequest || masonConfirmed ? (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-status-success border border-status-success/30 bg-status-success/10 rounded-[var(--radius-badge)] px-1.5 py-0.5">
          <CheckCircle size={9} /> Masons requested
        </span>
      ) : (
        <button
          onClick={onOpenMasonPicker}
          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border border-surface-border text-content-secondary hover:border-gold/30 hover:text-gold transition-colors whitespace-nowrap"
        >
          <Users size={11} /> Request Masons
        </button>
      )}
    </div>
  );
}

// ── Inline action form ────────────────────────────────────────────────────────

interface InlineActionFormProps {
  action:         NonNullable<InlineAction>;
  onReasonChange: (v: string) => void;
  onConfirm:      () => void;
  onCancel:       () => void;
}

function InlineActionForm({ action, onReasonChange, onConfirm, onCancel }: InlineActionFormProps) {
  const isReject = action.type === "reject";
  return (
    <div className="flex items-start gap-3 flex-wrap">
      <div className="flex-1 min-w-[220px]">
        <label className="text-[10px] font-bold uppercase tracking-widest text-content-muted block mb-1">
          {isReject ? "Rejection reason" : "Cancellation reason"}
        </label>
        <input
          type="text"
          autoFocus
          placeholder={isReject ? "e.g. Resource conflict on that date" : "e.g. Weather conditions"}
          value={action.reason}
          onChange={(e) => onReasonChange(e.target.value)}
          className="w-full text-xs bg-surface-overlay border border-surface-border rounded-lg px-3 py-1.5 text-content-primary focus:outline-none focus:border-gold"
        />
      </div>
      <div className="flex items-end gap-2 pb-0.5">
        <button
          onClick={onConfirm}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
            isReject
              ? "bg-status-error hover:bg-status-error/90 text-white"
              : "bg-surface-border hover:bg-surface-border/80 text-content-primary"
          }`}
        >
          {isReject ? "Reject Pour" : "Confirm Cancel"}
        </button>
        <button
          onClick={onCancel}
          className="text-xs text-content-muted hover:text-content-primary transition-colors"
        >
          Never mind
        </button>
      </div>
    </div>
  );
}
