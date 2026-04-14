"use client";

import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { useOps } from "@/providers/OpsProvider";
import type { WorkOrderStatus } from "@/lib/ops/types";
import { ArrowLeft } from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────

const COLUMNS: { status: WorkOrderStatus; label: string }[] = [
  { status: "open",          label: "Open" },
  { status: "in_progress",   label: "In Progress" },
  { status: "waiting_parts", label: "Waiting Parts" },
  { status: "complete",      label: "Complete" },
];

const TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  open:          ["in_progress"],
  in_progress:   ["waiting_parts", "complete"],
  waiting_parts: ["in_progress"],
  complete:      [],
};

const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  open:          "Open",
  in_progress:   "In Progress",
  waiting_parts: "Waiting Parts",
  complete:      "Complete",
};

const PRIORITY_CLASS: Record<string, string> = {
  high:   "text-status-critical border-status-critical/30 bg-status-critical/10",
  medium: "text-gold border-gold/30 bg-gold/10",
  low:    "text-content-secondary border-content-muted/30 bg-content-muted/15",
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WorkOrdersPage() {
  const { workOrders, updateWorkOrderStatus } = useOps();

  return (
    <PageContainer maxWidth="wide">

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
          <h1 className="text-lg font-bold text-content-primary">Work Orders</h1>
          <p className="text-xs text-content-muted">{workOrders.length} total</p>
        </div>
      </div>

      {/* Board */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
        {COLUMNS.map(({ status, label }) => {
          const col = workOrders.filter((wo) => wo.status === status);
          return (
            <div key={status}>
              {/* Column header */}
              <div className="flex items-center justify-between mb-3 px-0.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-content-muted">
                  {label}
                </span>
                <span className="text-[10px] font-bold text-content-muted bg-surface-overlay border border-surface-border rounded-full px-1.5 py-0.5">
                  {col.length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-2">
                {col.map((wo) => {
                  const allowedNext = TRANSITIONS[wo.status];
                  const fromCRU     = wo.sourceModule === "cru" || wo.assignedToId?.startsWith("cru_");
                  return (
                    <div
                      key={wo.id}
                      className="bg-surface-raised border border-surface-border rounded-[var(--radius-card)] p-4 shadow-[var(--shadow-card)]"
                    >
                      {/* Priority + source badges */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-widest border rounded-[var(--radius-badge)] px-1.5 py-0.5 ${PRIORITY_CLASS[wo.priority]}`}
                        >
                          {wo.priority}
                        </span>
                        {wo.sourceType === "request" && (
                          <span className="text-[10px] text-content-muted border border-surface-border bg-surface-overlay rounded-[var(--radius-badge)] px-1.5 py-0.5">
                            via request
                          </span>
                        )}
                        {fromCRU && (
                          <span className="text-[10px] font-bold text-gold border border-gold/30 bg-gold/10 rounded-[var(--radius-badge)] px-1.5 py-0.5 uppercase tracking-widest">
                            CRU
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-semibold text-content-primary leading-snug mb-1">
                        {wo.title}
                      </p>
                      <p className="text-xs text-content-secondary truncate">{wo.jobsite}</p>
                      <p className="text-xs text-content-muted mt-0.5">
                        {wo.assignedToLabel}
                        {wo.assignedToRole && (
                          <span className="text-content-muted/60"> · {wo.assignedToRole}</span>
                        )}
                      </p>

                      {/* Status transition */}
                      {allowedNext.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-surface-border">
                          <select
                            className="w-full text-xs bg-surface-overlay border border-surface-border rounded-lg px-2 py-1.5 text-content-secondary focus:outline-none focus:border-gold cursor-pointer"
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                updateWorkOrderStatus(wo.id, e.target.value as WorkOrderStatus);
                              }
                            }}
                          >
                            <option value="" disabled>Move to…</option>
                            {allowedNext.map((s) => (
                              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}

                {col.length === 0 && (
                  <div className="border border-dashed border-surface-border rounded-[var(--radius-card)] p-5 text-center">
                    <p className="text-xs text-content-muted">Empty</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </PageContainer>
  );
}
