"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { MOCK_POUR_EVENTS } from "@/lib/ops/mock-data";
import type { PourEventStatus } from "@/lib/ops/types";
import { getCruSiteEventsForOrg } from "@/lib/integrations/cru";
import type { CruSiteEvent } from "@/lib/integrations/cru";
import { useOrg } from "@/providers/OrgProvider";
import { useOps } from "@/providers/OpsProvider";
import { ArrowLeft, AlertTriangle, CheckCircle, Droplets, Loader, Truck, Users } from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<PourEventStatus, string> = {
  planned:   "text-content-muted    border-surface-border      bg-surface-overlay",
  confirmed: "text-gold             border-gold/30             bg-gold/10",
  completed: "text-status-success   border-status-success/30   bg-status-success/10",
};

const STATUS_LABELS: Record<PourEventStatus, string> = {
  planned:   "Planned",
  confirmed: "Confirmed",
  completed: "Completed",
};

// Date range covering all current mock data + near future.
// Phase 3: drive this from a date-range picker or the current month.
const CRU_QUERY_START = "2026-04-01";
const CRU_QUERY_END   = "2026-04-30";

// ── Merged row type ───────────────────────────────────────────────────────────

interface PourRow {
  id:           string;
  jobsite:      string;
  date:         string;
  yardage:      number;
  pumpRequired: boolean;
  crewRequired: string;
  status:       PourEventStatus;
  conflicts?:   boolean;
  /** 'ops' = OPS mock/service; 'cru' = CRU integration */
  source:       "ops" | "cru";
}

// ── Map CRU event → PourRow ───────────────────────────────────────────────────

function cruEventToPourRow(e: CruSiteEvent): PourRow {
  return {
    id:           e.id,
    jobsite:      e.siteName,
    date:         e.date,
    yardage:      e.yardage ?? 0,
    pumpRequired: e.pumpRequired ?? false,
    crewRequired: e.crewName ?? "TBD",
    status:       e.status,
    source:       "cru",
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PourSchedulePage() {
  const { currentOrganization } = useOrg();
  const { requests, createRequest } = useOps();
  // Use the CRU-specific UUID when available; fall back to platform ID.
  const cruOrgId = currentOrganization.cruOrgId ?? currentOrganization.id;

  // OPS events are local mock — synchronous, stable reference
  const opsPours = useMemo<PourRow[]>(
    () => MOCK_POUR_EVENTS.map((e) => ({ ...e, source: "ops" as const })),
    [],
  );

  // CRU events load asynchronously — graceful fallback if unavailable
  const [cruPours,    setCruPours]    = useState<PourRow[]>([]);
  const [loadingCru,  setLoadingCru]  = useState(true);
  const [cruError,    setCruError]    = useState(false);

  // ── Per-row action state ───────────────────────────────────────────────────
  // masonPickerRowId: which row has the inline quantity picker open
  // masonQty: headcount for the open picker
  // confirmedRows: rowId → which request types have been confirmed (for feedback badges)
  const [masonPickerRowId, setMasonPickerRowId] = useState<string | null>(null);
  const [masonQty,         setMasonQty]         = useState(4);
  const [confirmedRows,    setConfirmedRows]     = useState<Record<string, Set<"pump" | "mason">>>({});

  useEffect(() => {
    let cancelled = false;

    getCruSiteEventsForOrg(cruOrgId, CRU_QUERY_START, CRU_QUERY_END, "pour")
      .then((data) => {
        if (cancelled) return;
        setCruPours(data.map(cruEventToPourRow));
      })
      .catch(() => {
        // CRU unavailable — fall back to OPS-only view
        if (!cancelled) setCruError(true);
      })
      .finally(() => {
        if (!cancelled) setLoadingCru(false);
      });

    return () => { cancelled = true; };
  }, [cruOrgId]);

  // Merge and sort when either source changes
  const events = useMemo<PourRow[]>(
    () => [...opsPours, ...cruPours].sort((a, b) => a.date.localeCompare(b.date)),
    [opsPours, cruPours],
  );

  // ── Request helpers ───────────────────────────────────────────────────────

  function hasPendingRequest(rowId: string, type: "pump_truck" | "mason"): boolean {
    const event = events.find((e) => e.id === rowId);
    if (!event) return false;
    return requests.some(
      (r) => r.type === type && r.jobsite === event.jobsite && r.dateNeeded === event.date,
    );
  }

  function handleRequestPump(event: PourRow) {
    createRequest({
      type:       "pump_truck",
      jobsite:    event.jobsite,
      dateNeeded: event.date,
      notes:      `Pump truck needed for ${event.yardage} yd³ pour.`,
      status:     "pending",
      requestedBy: currentOrganization.name,
    });
    setConfirmedRows((prev) => {
      const next = new Set(prev[event.id] ?? []) as Set<"pump" | "mason">;
      next.add("pump");
      return { ...prev, [event.id]: next };
    });
    setTimeout(() => {
      setConfirmedRows((prev) => {
        const next = new Set(prev[event.id]);
        next.delete("pump");
        return { ...prev, [event.id]: next };
      });
    }, 4000);
  }

  function handleOpenMasonPicker(rowId: string) {
    setMasonPickerRowId(rowId);
    setMasonQty(4);
  }

  function handleConfirmMasons(event: PourRow) {
    createRequest({
      type:           "mason",
      jobsite:        event.jobsite,
      dateNeeded:     event.date,
      notes:          `${masonQty} masons requested for pour (${event.yardage} yd³).`,
      status:         "pending",
      requestedBy:    currentOrganization.name,
      requestedCount: masonQty,
    });
    setMasonPickerRowId(null);
    setConfirmedRows((prev) => {
      const next = new Set(prev[event.id] ?? []) as Set<"pump" | "mason">;
      next.add("mason");
      return { ...prev, [event.id]: next };
    });
    setTimeout(() => {
      setConfirmedRows((prev) => {
        const next = new Set(prev[event.id]);
        next.delete("mason");
        return { ...prev, [event.id]: next };
      });
    }, 4000);
  }

  const totalYardage  = events.filter((e) => e.status !== "completed").reduce((s, e) => s + e.yardage, 0);
  const conflictCount = events.filter((e) => e.conflicts).length;
  const cruCount      = cruPours.length;

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
          <h1 className="text-lg font-bold text-content-primary">Pour Schedule</h1>
          <p className="text-xs text-content-muted">
            {loadingCru ? (
              <span className="inline-flex items-center gap-1">
                <Loader size={10} className="animate-spin" /> Loading CRU events…
              </span>
            ) : cruError ? (
              <>{opsPours.length} events · <span className="text-status-warning">CRU unavailable</span></>
            ) : (
              <>
                {events.length} events
                {cruCount > 0 && <> · <span className="text-gold">{cruCount} from CRU</span></>}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <div className="bg-surface-raised border border-surface-border rounded-[var(--radius-card)] px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-1">Upcoming Yardage</p>
          <p className="text-xl font-bold text-content-primary">
            {totalYardage} <span className="text-sm font-normal text-content-muted">yd³</span>
          </p>
        </div>
        <div className="bg-surface-raised border border-surface-border rounded-[var(--radius-card)] px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-1">Pump Required</p>
          <p className="text-xl font-bold text-content-primary">
            {events.filter((e) => e.pumpRequired && e.status !== "completed").length}
            <span className="text-sm font-normal text-content-muted"> events</span>
          </p>
        </div>
        {conflictCount > 0 && (
          <div className="bg-surface-raised border border-status-warning/30 rounded-[var(--radius-card)] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-status-warning mb-1">Conflicts</p>
            <p className="text-xl font-bold text-status-warning">{conflictCount}</p>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-surface-raised border border-surface-border rounded-[var(--radius-card)] overflow-hidden shadow-[var(--shadow-card)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border">
              <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted px-5 py-3">Jobsite</th>
              <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted px-4 py-3">Date</th>
              <th className="text-right text-[10px] font-bold uppercase tracking-widest text-content-muted px-4 py-3">Yardage</th>
              <th className="text-center text-[10px] font-bold uppercase tracking-widest text-content-muted px-4 py-3">Pump</th>
              <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted px-4 py-3 hidden md:table-cell">Crew</th>
              <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted px-4 py-3">Status</th>
              <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted px-5 py-3 hidden md:table-cell">Source</th>
              <th className="text-left text-[10px] font-bold uppercase tracking-widest text-content-muted px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {events.map((event) => (
              <tr key={event.id} className="hover:bg-surface-overlay transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    {event.conflicts && (
                      <span title="Potential conflict" className="shrink-0">
                        <AlertTriangle size={13} className="text-status-warning" />
                      </span>
                    )}
                    <span className="text-content-primary font-medium text-sm truncate max-w-[180px]">
                      {event.jobsite}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-content-secondary text-xs whitespace-nowrap">
                  {event.date}
                </td>
                <td className="px-4 py-3.5 text-right">
                  <span className="text-content-primary font-semibold text-sm">{event.yardage}</span>
                  <span className="text-content-muted text-xs ml-1">yd³</span>
                </td>
                <td className="px-4 py-3.5 text-center">
                  {event.pumpRequired
                    ? <Droplets size={14} className="text-gold inline-block" />
                    : <span className="text-content-muted text-xs">—</span>
                  }
                </td>
                <td className="px-4 py-3.5 text-content-secondary text-xs hidden md:table-cell">
                  {event.crewRequired}
                </td>
                <td className="px-4 py-3.5">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest border rounded-[var(--radius-badge)] px-1.5 py-0.5 ${STATUS_STYLES[event.status]}`}
                  >
                    {event.status === "completed" && <CheckCircle size={10} />}
                    {STATUS_LABELS[event.status]}
                  </span>
                </td>
                <td className="px-5 py-3.5 hidden md:table-cell">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-widest border rounded-[var(--radius-badge)] px-1.5 py-0.5 ${
                      event.source === "cru"
                        ? "text-gold border-gold/30 bg-gold/10"
                        : "text-content-muted border-surface-border bg-surface-overlay"
                    }`}
                  >
                    {event.source.toUpperCase()}
                  </span>
                </td>

                {/* ── Actions ─────────────────────────────────────────── */}
                <td className="px-4 py-3.5">
                  {event.status === "completed" ? (
                    <span className="text-xs text-content-muted">—</span>
                  ) : (
                    <div className="flex flex-col gap-1.5 min-w-[140px]">

                      {/* Pump truck button */}
                      {event.pumpRequired && (
                        hasPendingRequest(event.id, "pump_truck") || confirmedRows[event.id]?.has("pump") ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-gold border border-gold/30 bg-gold/10 rounded-[var(--radius-badge)] px-1.5 py-0.5">
                            <CheckCircle size={9} />
                            Pump requested
                          </span>
                        ) : (
                          <button
                            onClick={() => handleRequestPump(event)}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border border-gold/30 text-gold hover:bg-gold/10 transition-colors whitespace-nowrap"
                          >
                            <Truck size={11} />
                            Request Pump
                          </button>
                        )
                      )}

                      {/* Mason picker */}
                      {masonPickerRowId === event.id ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={masonQty}
                            onChange={(e) => setMasonQty(Math.max(1, Math.min(20, Number(e.target.value))))}
                            className="w-14 text-xs bg-surface-overlay border border-surface-border rounded-lg px-2 py-1 text-content-primary focus:outline-none focus:border-gold"
                          />
                          <span className="text-[10px] text-content-muted">masons</span>
                          <button
                            onClick={() => handleConfirmMasons(event)}
                            className="text-xs font-semibold px-2 py-1 rounded-lg bg-gold hover:bg-gold-hover text-content-inverse transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setMasonPickerRowId(null)}
                            className="text-xs text-content-muted hover:text-content-primary transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : hasPendingRequest(event.id, "mason") || confirmedRows[event.id]?.has("mason") ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-status-success border border-status-success/30 bg-status-success/10 rounded-[var(--radius-badge)] px-1.5 py-0.5">
                          <CheckCircle size={9} />
                          Masons requested
                        </span>
                      ) : (
                        <button
                          onClick={() => handleOpenMasonPicker(event.id)}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border border-surface-border text-content-secondary hover:border-gold/30 hover:text-gold transition-colors whitespace-nowrap"
                        >
                          <Users size={11} />
                          Request Masons
                        </button>
                      )}

                    </div>
                  )}
                </td>
              </tr>
            ))}
            {/* Loading placeholder row — visible on first render before CRU resolves */}
            {loadingCru && events.length === opsPours.length && (
              <tr>
                <td colSpan={8} className="px-5 py-3 text-center">
                  <span className="inline-flex items-center gap-1.5 text-xs text-content-muted">
                    <Loader size={11} className="animate-spin" />
                    Loading CRU pour events…
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </PageContainer>
  );
}
