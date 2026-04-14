"use client";

import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { useMx } from "@/providers/MxProvider";
import { STATUS_LABELS, STATUS_BADGE, READINESS_BADGE, READINESS_LABELS } from "@/lib/mx/rules";
import { ArrowLeft, ArrowUpRight, Wrench, AlertTriangle } from "lucide-react";

/**
 * OPS Maintenance Status — read-only view of MX work orders.
 *
 * OPS surfaces impact and links out to MX. All work order execution
 * (status transitions, assignment, notes) happens in the MX module.
 */

export default function OpsMaintenanceStatusPage() {
  const { workOrders, readiness } = useMx();

  // Show only active (non-terminal) work orders that are OPS-blocking or have readiness impact
  const relevant = workOrders.filter(
    (wo) => wo.status !== "completed" && wo.status !== "canceled",
  );

  const blocking = relevant.filter((wo) => wo.opsBlocking);
  const monitored = relevant.filter((wo) => !wo.opsBlocking && wo.readinessImpact !== null);

  return (
    <PageContainer maxWidth="wide">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/modules/ops"
            className="text-content-muted hover:text-content-primary transition-colors"
            aria-label="Back to OPS"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-content-primary">Maintenance Status</h1>
            <p className="text-xs text-content-muted">
              {relevant.length} active work order{relevant.length !== 1 ? "s" : ""}
              {blocking.length > 0 && (
                <span className="ml-2 text-status-critical font-semibold">
                  {blocking.length} OPS-blocking
                </span>
              )}
            </p>
          </div>
        </div>

        {/* CTA — all work order management happens in MX */}
        <Link
          href="/modules/mx/work-orders"
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal hover:opacity-90 text-white text-xs font-semibold rounded-lg transition-opacity"
        >
          <Wrench size={13} /> Open in MX
        </Link>
      </div>

      {/* Readiness summary strip */}
      {readiness.length > 0 && (
        <div className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-2">
            Equipment Readiness
          </p>
          <div className="flex flex-wrap gap-2">
            {readiness.map((r) => (
              <span
                key={r.equipmentId}
                className={`inline-flex items-center gap-1.5 text-[10px] font-semibold border rounded-[var(--radius-badge)] px-2 py-1 ${READINESS_BADGE[r.status]}`}
              >
                {r.equipmentLabel}
                <span className="opacity-70">·</span>
                {READINESS_LABELS[r.status]}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* OPS-Blocking section */}
      {blocking.length > 0 && (
        <div className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-2 flex items-center gap-1.5">
            <AlertTriangle size={11} className="text-status-critical" />
            OPS-Blocking
          </p>
          <div className="space-y-2">
            {blocking.map((wo) => (
              <MaintenanceCard key={wo.id} wo={wo} />
            ))}
          </div>
        </div>
      )}

      {/* Monitored section */}
      {monitored.length > 0 && (
        <div className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-2">
            Monitored
          </p>
          <div className="space-y-2">
            {monitored.map((wo) => (
              <MaintenanceCard key={wo.id} wo={wo} />
            ))}
          </div>
        </div>
      )}

      {relevant.length === 0 && (
        <div className="border border-dashed border-surface-border rounded-[var(--radius-card)] p-12 text-center">
          <p className="text-sm text-content-muted">No active maintenance work orders.</p>
          <Link href="/modules/mx/work-orders" className="mt-3 inline-block text-xs text-teal hover:underline">
            View all in MX →
          </Link>
        </div>
      )}

    </PageContainer>
  );
}

// ── Maintenance Card ──────────────────────────────────────────────────────────

import type { MxWorkOrder } from "@/lib/mx/types";

function MaintenanceCard({ wo }: { wo: MxWorkOrder }) {
  return (
    <div className="bg-surface-raised border border-surface-border rounded-[var(--radius-card)] px-4 py-3 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {/* WO number + title */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono text-content-muted">{wo.woNumber}</span>
            {wo.opsBlocking && (
              <AlertTriangle size={11} className="text-status-critical flex-shrink-0" />
            )}
          </div>
          <p className="text-sm font-semibold text-content-primary leading-snug truncate">
            {wo.title}
          </p>

          {/* Equipment + project */}
          {wo.equipmentLabel && (
            <p className="text-xs text-content-secondary mt-0.5 truncate">{wo.equipmentLabel}</p>
          )}

          {/* Status + readiness */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className={`text-[10px] font-semibold uppercase tracking-wide border rounded-[var(--radius-badge)] px-1.5 py-0.5 ${STATUS_BADGE[wo.status]}`}>
              {STATUS_LABELS[wo.status]}
            </span>
            {wo.readinessImpact && (
              <span className={`text-[10px] font-semibold border rounded-[var(--radius-badge)] px-1.5 py-0.5 ${READINESS_BADGE[wo.readinessImpact]}`}>
                {READINESS_LABELS[wo.readinessImpact]}
              </span>
            )}
            {wo.neededByDate && (
              <span className="text-[10px] text-content-muted">Needed {wo.neededByDate}</span>
            )}
          </div>

          {/* Notes / blocker info */}
          {wo.completionNotes && (
            <p className="text-xs text-content-muted mt-1.5 italic leading-relaxed line-clamp-2">
              {wo.completionNotes}
            </p>
          )}
        </div>

        {/* Open in MX */}
        <Link
          href={`/modules/mx/work-orders?inspect=${wo.id}`}
          className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold text-teal border border-teal/30 rounded-lg px-2 py-1 hover:bg-teal/5 transition-colors"
          title="Open in MX"
        >
          MX <ArrowUpRight size={10} />
        </Link>
      </div>
    </div>
  );
}
