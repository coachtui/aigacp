"use client";

import { useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { useOps } from "@/providers/OpsProvider";
import {
  getCruAvailableWorkersByRole,
  OPS_REQUEST_TO_CRU_ROLE,
} from "@/lib/integrations/cru";
import type { CruWorker } from "@/lib/integrations/cru";
import type { Request as OpsRequest, RequestStatus } from "@/lib/ops/types";
import { useOrg } from "@/providers/OrgProvider";
import { ArrowLeft, CheckCircle, Truck, Users, Wrench, UserCheck, Loader } from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────

const TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  pending:  ["approved"],
  approved: ["assigned"],
  assigned: [],
};

const STATUS_STYLES: Record<RequestStatus, string> = {
  pending:  "text-status-warning  border-status-warning/30  bg-status-warning/10",
  approved: "text-gold            border-gold/30            bg-gold/10",
  assigned: "text-status-success  border-status-success/30  bg-status-success/10",
};

const TYPE_LABELS: Record<string, string> = {
  mason:      "Mason",
  pump_truck: "Pump Truck",
  equipment:  "Equipment",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  mason:      <Users  size={14} className="text-content-muted" />,
  pump_truck: <Truck  size={14} className="text-content-muted" />,
  equipment:  <Wrench size={14} className="text-content-muted" />,
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RequestsPage() {
  const { requests: allRequests, approveRequest, assignRequest } = useOps();
  const { currentOrganization } = useOrg();

  // Pour-linked pump/mason requests are managed in the Pour Schedule hub.
  // This page handles equipment and mechanics requests only.
  const requests = allRequests.filter((r) => !r.sourcePourId);
  // Use the CRU-specific UUID when available; fall back to platform ID.
  const cruOrgId = currentOrganization.cruOrgId ?? currentOrganization.id;

  // Transient UI state — notification, worker picker lifecycle
  const [lastCreated,      setLastCreated]      = useState<string | null>(null);
  const [assigningId,      setAssigningId]      = useState<string | null>(null);
  const [workerOptions,    setWorkerOptions]    = useState<CruWorker[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("");
  const [loadingWorkers,   setLoadingWorkers]   = useState(false);

  // ── Approve ──────────────────────────────────────────────────────────────────
  function handleApprove(id: string) {
    approveRequest(id);
  }

  // ── Assign step 1: open worker selector, load CRU workers async ─────────────
  async function startAssign(req: OpsRequest) {
    setAssigningId(req.id);
    setLoadingWorkers(true);
    setWorkerOptions([]);
    setSelectedWorkerId("");
    try {
      const cruRole = OPS_REQUEST_TO_CRU_ROLE[req.type];
      const workers = await getCruAvailableWorkersByRole(cruOrgId, cruRole);
      setWorkerOptions(workers);
      setSelectedWorkerId(workers[0]?.id ?? "");
    } catch {
      // CRU unavailable — leave workerOptions empty; user sees fallback message
      setWorkerOptions([]);
    } finally {
      setLoadingWorkers(false);
    }
  }

  // ── Assign step 2: confirm selected worker ───────────────────────────────────
  function confirmAssign(req: OpsRequest) {
    const worker = workerOptions.find((w) => w.id === selectedWorkerId);
    assignRequest(req.id, worker ? { id: worker.id, label: worker.name, role: worker.role } : undefined);

    const workerNote = worker ? ` → ${worker.name}` : "";
    setLastCreated(`Dispatch: ${TYPE_LABELS[req.type]} — ${req.jobsite}${workerNote}`);
    setTimeout(() => setLastCreated(null), 5000);

    setAssigningId(null);
    setWorkerOptions([]);
    setSelectedWorkerId("");
  }

  function cancelAssign() {
    setAssigningId(null);
    setWorkerOptions([]);
    setSelectedWorkerId("");
  }

  return (
    <PageContainer>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/modules/ops"
          className="text-content-muted hover:text-content-primary transition-colors"
          aria-label="Back to OPS"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-content-primary">Requests</h1>
          <p className="text-xs text-content-muted">
            Equipment &amp; mechanics · {requests.length} open
          </p>
        </div>
      </div>

      {/* Auto-created work order notice */}
      {lastCreated && (
        <div className="mb-4 flex items-center gap-2.5 px-4 py-3 rounded-[var(--radius-card)] border border-status-success/30 bg-status-success/5 text-sm text-status-success">
          <CheckCircle size={14} />
          <span>Work order created: <span className="font-semibold">{lastCreated}</span></span>
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {requests.map((req) => {
          const allowed     = TRANSITIONS[req.status];
          const isAssigning = assigningId === req.id;

          return (
            <div
              key={req.id}
              className="bg-surface-raised border border-surface-border rounded-[var(--radius-card)] px-5 py-4 shadow-[var(--shadow-card)]"
            >
              <div className="flex items-start justify-between gap-4">

                {/* Left: type + details */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-surface-overlay border border-surface-border flex items-center justify-center shrink-0 mt-0.5">
                    {TYPE_ICONS[req.type]}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-semibold text-content-primary">
                        {TYPE_LABELS[req.type]}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-widest border rounded-[var(--radius-badge)] px-1.5 py-0.5 ${STATUS_STYLES[req.status]}`}
                      >
                        {req.status}
                      </span>
                    </div>
                    <p className="text-xs text-content-secondary truncate">{req.jobsite}</p>
                    <p className="text-xs text-content-muted mt-0.5">
                      Needed: {req.dateNeeded}
                      {req.requestedBy && <> · Requested by {req.requestedBy}</>}
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
                {!isAssigning && allowed.length > 0 && (
                  <div className="flex items-center gap-2 shrink-0">
                    {allowed.includes("approved") && (
                      <button
                        onClick={() => handleApprove(req.id)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gold/30 text-gold hover:bg-gold/10 transition-colors"
                      >
                        Approve
                      </button>
                    )}
                    {allowed.includes("assigned") && (
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

              {/* ── Inline CRU worker selector ─────────────────────────────── */}
              {isAssigning && (
                <div className="mt-3 pt-3 border-t border-surface-border">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-2">
                    Select worker from CRU
                    <span className="ml-1.5 font-normal normal-case">
                      · {OPS_REQUEST_TO_CRU_ROLE[req.type]}s available
                    </span>
                  </p>

                  {loadingWorkers ? (
                    <div className="flex items-center gap-2 text-xs text-content-muted">
                      <Loader size={12} className="animate-spin" />
                      Loading workers…
                    </div>
                  ) : workerOptions.length === 0 ? (
                    <p className="text-xs text-content-muted italic">
                      No available workers in CRU for this role.
                    </p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        className="flex-1 min-w-[180px] text-xs bg-surface-overlay border border-surface-border rounded-lg px-2 py-1.5 text-content-secondary focus:outline-none focus:border-gold cursor-pointer"
                        value={selectedWorkerId}
                        onChange={(e) => setSelectedWorkerId(e.target.value)}
                      >
                        {workerOptions.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}{w.siteName ? ` · ${w.siteName}` : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => confirmAssign(req)}
                        disabled={!selectedWorkerId}
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

    </PageContainer>
  );
}
