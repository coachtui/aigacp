"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { useMx } from "@/providers/MxProvider";
import { useOrg } from "@/providers/OrgProvider";
import {
  STATUS_LABELS, STATUS_BADGE,
  PRIORITY_LABELS, PRIORITY_BADGE,
  WO_TRANSITIONS,
  canUpdateWorkOrderStatus,
} from "@/lib/mx/rules";
import type { MxWorkOrder, MxWorkOrderStatus } from "@/lib/mx/types";
import {
  ArrowLeft, Clock, CalendarDays, AlertTriangle,
  Wrench, CheckCircle2, Inbox, Timer, Play,
  PackageX, XCircle, RotateCcw, Send, X as XIcon,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_WEIGHT: Record<string, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};

function sortByPriority(wos: MxWorkOrder[]): MxWorkOrder[] {
  return [...wos].sort((a, b) => {
    if (a.opsBlocking !== b.opsBlocking) return a.opsBlocking ? -1 : 1;
    const pw = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    if (pw !== 0) return pw;
    if (a.neededByDate && b.neededByDate) return a.neededByDate.localeCompare(b.neededByDate);
    if (a.neededByDate) return -1;
    if (b.neededByDate) return 1;
    return 0;
  });
}

type Urgency = "overdue" | "today" | "tomorrow";

function getUrgency(neededByDate?: string): Urgency | null {
  if (!neededByDate) return null;
  const today    = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split("T")[0];
  if (neededByDate < today)       return "overdue";
  if (neededByDate === today)     return "today";
  if (neededByDate === tomorrow)  return "tomorrow";
  return null;
}

const URGENCY_STYLE: Record<Urgency, string> = {
  overdue:  "text-status-critical bg-status-critical/10 border-status-critical/30 font-bold",
  today:    "text-gold bg-gold/10 border-gold/30 font-semibold",
  tomorrow: "text-content-secondary bg-content-muted/15 border-content-muted/30",
};

const URGENCY_LABEL: Record<Urgency, string> = {
  overdue:  "Overdue",
  today:    "Due Today",
  tomorrow: "Due Tomorrow",
};

function elapsed(isoStart: string): string {
  const ms = Date.now() - new Date(isoStart).getTime();
  const h  = Math.floor(ms / 3_600_000);
  const m  = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ── Quick Action Config ───────────────────────────────────────────────────────

// These statuses prompt for a note before confirming the transition
const NOTE_STATUSES = new Set<MxWorkOrderStatus>(["waiting_parts", "blocked"]);

type ActionDef = {
  label:  string;
  status: MxWorkOrderStatus;
  style:  string;
  icon:   React.ReactNode;
};

function getActions(status: MxWorkOrderStatus): ActionDef[] {
  const allowed = WO_TRANSITIONS[status];
  const defs: ActionDef[] = [
    { label: "Start Work",     status: "in_progress",   style: "bg-teal text-white hover:opacity-90 border-teal",                              icon: <Play size={10} /> },
    { label: "Waiting Parts",  status: "waiting_parts", style: "border-gold/40 text-gold hover:bg-gold/10",                                    icon: <PackageX size={10} /> },
    { label: "Mark Blocked",   status: "blocked",       style: "border-status-critical/30 text-status-critical hover:bg-status-critical/10",   icon: <XCircle size={10} /> },
    { label: "Resume",         status: "in_progress",   style: "bg-teal text-white hover:opacity-90 border-teal",                              icon: <RotateCcw size={10} /> },
    { label: "Complete",       status: "completed",     style: "bg-status-success text-white hover:opacity-90 border-status-success",                    icon: <CheckCircle2 size={10} /> },
  ];
  return defs.filter((d) => allowed.includes(d.status));
}

// ── WO Card ───────────────────────────────────────────────────────────────────

function WoCard({
  wo,
  accent,
  onAction,
  onNote,
}: {
  wo:       MxWorkOrder;
  accent?:  boolean;
  onAction: (woId: string, status: MxWorkOrderStatus) => void;
  onNote:   (woId: string, note: string) => void;
}) {
  const urgency = getUrgency(wo.neededByDate);
  const actions = getActions(wo.status);

  // Inline note prompt state
  const [pendingStatus, setPendingStatus] = useState<MxWorkOrderStatus | null>(null);
  const [noteText,      setNoteText]      = useState("");

  function handleActionClick(status: MxWorkOrderStatus) {
    if (NOTE_STATUSES.has(status)) {
      setPendingStatus(status);
      setNoteText("");
    } else {
      onAction(wo.id, status);
    }
  }

  function confirmPending() {
    if (!pendingStatus) return;
    if (noteText.trim()) onNote(wo.id, noteText.trim());
    onAction(wo.id, pendingStatus);
    setPendingStatus(null);
    setNoteText("");
  }

  function cancelPending() {
    setPendingStatus(null);
    setNoteText("");
  }

  const NOTE_PLACEHOLDER: Partial<Record<MxWorkOrderStatus, string>> = {
    waiting_parts: "What parts are needed?",
    blocked:       "What is blocking this work?",
  };

  return (
    <div
      className={`border rounded-[var(--radius-card)] p-3 transition-colors shadow-[var(--shadow-card)] ${
        accent
          ? "bg-teal/5 border-teal/30"
          : urgency === "overdue"
          ? "bg-status-critical/5 border-status-critical/20"
          : "bg-surface-raised border-surface-border"
      }`}
    >
      {/* Top row: badges + WO number */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex flex-wrap gap-1">
          <span className={`text-[10px] font-bold uppercase tracking-widest border rounded-[var(--radius-badge)] px-1.5 py-0.5 ${PRIORITY_BADGE[wo.priority]}`}>
            {PRIORITY_LABELS[wo.priority]}
          </span>
          <span className={`text-[10px] font-semibold border rounded-[var(--radius-badge)] px-1.5 py-0.5 ${STATUS_BADGE[wo.status]}`}>
            {STATUS_LABELS[wo.status]}
          </span>
          {wo.opsBlocking && (
            <span className="flex items-center gap-0.5 text-[10px] text-status-critical font-semibold">
              <AlertTriangle size={10} /> OPS
            </span>
          )}
          {urgency && (
            <span className={`text-[10px] border rounded-[var(--radius-badge)] px-1.5 py-0.5 ${URGENCY_STYLE[urgency]}`}>
              {URGENCY_LABEL[urgency]}
            </span>
          )}
        </div>
        <span className="text-[10px] text-content-muted flex-shrink-0">{wo.woNumber}</span>
      </div>

      {/* Title */}
      <Link href={`/modules/mx/work-orders/${wo.id}`} className="block hover:underline">
        <p className="text-xs font-semibold text-content-primary leading-snug">{wo.title}</p>
      </Link>

      {/* Description */}
      {wo.description && (
        <p className="text-[10px] text-content-secondary mt-1 leading-snug line-clamp-2">
          {wo.description}
        </p>
      )}

      {/* Equipment */}
      {wo.equipmentLabel && (
        <p className="text-[10px] text-content-muted mt-1">{wo.equipmentLabel}</p>
      )}

      {/* Date / timer row */}
      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-2">
        {wo.actualStart && wo.status === "in_progress" && (
          <span className="flex items-center gap-1 text-[10px] text-status-info">
            <Timer size={10} /> {elapsed(wo.actualStart)} active
          </span>
        )}
        {wo.neededByDate && (
          <span className={`flex items-center gap-1 text-[10px] ${urgency === "overdue" ? "text-status-critical font-semibold" : urgency === "today" ? "text-gold font-semibold" : "text-content-muted"}`}>
            <CalendarDays size={10} />
            Needed {wo.neededByDate}
          </span>
        )}
        {wo.scheduledStart && wo.status === "scheduled" && (
          <span className="flex items-center gap-1 text-[10px] text-teal">
            <Clock size={10} />
            {new Date(wo.scheduledStart).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        )}
        {wo.completionNotes && (wo.status === "waiting_parts" || wo.status === "blocked") && (
          <span className="text-[10px] text-content-muted italic truncate max-w-[200px]" title={wo.completionNotes}>
            Note: {wo.completionNotes}
          </span>
        )}
      </div>

      {/* Inline note prompt */}
      {pendingStatus && (
        <div className="mt-3 pt-2.5 border-t border-surface-border space-y-2">
          <p className="text-[10px] font-semibold text-content-muted uppercase tracking-widest">
            {STATUS_LABELS[pendingStatus]} — add a note
          </p>
          <textarea
            autoFocus
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder={NOTE_PLACEHOLDER[pendingStatus] ?? "Optional note…"}
            rows={2}
            className="w-full text-xs bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-content-primary placeholder:text-content-muted focus:outline-none focus:border-teal resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) confirmPending();
              if (e.key === "Escape") cancelPending();
            }}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={confirmPending}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-teal text-white border border-teal rounded-lg hover:opacity-90 transition-opacity"
            >
              <Send size={10} /> Confirm
            </button>
            <button
              onClick={cancelPending}
              className="flex items-center gap-1 px-2 py-1 text-[11px] text-content-muted border border-surface-border rounded-lg hover:bg-surface-overlay transition-colors"
            >
              <XIcon size={10} /> Cancel
            </button>
            <span className="text-[10px] text-content-muted">⌘↵ to confirm · Esc to cancel</span>
          </div>
        </div>
      )}

      {/* Quick actions (hidden while note prompt is open) */}
      {!pendingStatus && actions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-surface-border">
          {actions.map((action) => (
            <button
              key={`${action.status}-${action.label}`}
              onClick={(e) => { e.stopPropagation(); handleActionClick(action.status); }}
              className={`flex items-center gap-1 px-2 py-1 text-[11px] font-semibold border rounded-lg transition-colors ${action.style}`}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({
  icon,
  label,
  count,
  children,
  emptyMessage,
}: {
  icon:         React.ReactNode;
  label:        string;
  count:        number;
  children?:    React.ReactNode;
  emptyMessage: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-xs font-bold uppercase tracking-widest text-content-muted">{label}</span>
        <span className="ml-auto text-[10px] font-bold text-content-muted bg-surface-overlay border border-surface-border rounded-full px-1.5 py-0.5">
          {count}
        </span>
      </div>
      {count === 0 ? (
        <div className="border border-dashed border-surface-border rounded-[var(--radius-card)] p-5 text-center">
          <p className="text-xs text-content-muted">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MyWorkPage() {
  const { workOrders, updateWorkOrderStatus, updateWorkOrder } = useMx();
  const { currentUser, role }                                  = useOrg();

  const canAct = canUpdateWorkOrderStatus(role);

  const myWos = useMemo(
    () => workOrders.filter((wo) => wo.assignedMechanicIds.includes(currentUser.id)),
    [workOrders, currentUser.id],
  );

  const current   = useMemo(() => sortByPriority(myWos.filter((wo) => wo.status === "in_progress")),                                        [myWos]);
  const scheduled = useMemo(() => sortByPriority(myWos.filter((wo) => wo.status === "scheduled")),                                           [myWos]);
  const queued    = useMemo(() => sortByPriority(myWos.filter((wo) => ["open", "triage", "approved"].includes(wo.status))),                  [myWos]);
  const stalled   = useMemo(() => sortByPriority(myWos.filter((wo) => ["waiting_parts", "blocked"].includes(wo.status))),                    [myWos]);
  const completed = useMemo(() =>                myWos.filter((wo) => wo.status === "completed"),                                            [myWos]);

  const overdueCount = useMemo(
    () => myWos.filter((wo) => getUrgency(wo.neededByDate) === "overdue" && wo.status !== "completed" && wo.status !== "canceled").length,
    [myWos],
  );

  function handleAction(woId: string, status: MxWorkOrderStatus) {
    if (canAct) updateWorkOrderStatus(woId, status);
  }

  function handleNote(woId: string, note: string) {
    updateWorkOrder(woId, { completionNotes: note });
  }

  return (
    <PageContainer>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/modules/mx" className="text-content-muted hover:text-content-primary transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-content-primary">My Work</h1>
          <p className="text-xs text-content-muted">
            {myWos.length} active WO{myWos.length !== 1 ? "s" : ""} · {currentUser.name}
            {overdueCount > 0 && (
              <span className="ml-2 text-status-critical font-semibold">
                {overdueCount} overdue
              </span>
            )}
          </p>
        </div>
        <Link href="/modules/mx/scheduling" className="ml-auto text-xs text-teal hover:underline font-semibold">
          Scheduling →
        </Link>
      </div>

      {myWos.length === 0 ? (
        <div className="border border-dashed border-surface-border rounded-[var(--radius-card)] p-12 text-center">
          <Inbox size={24} className="text-content-muted mx-auto mb-3" />
          <p className="text-sm font-semibold text-content-primary">No work orders assigned to you</p>
          <p className="text-xs text-content-muted mt-1">
            Visit the{" "}
            <Link href="/modules/mx/scheduling" className="text-teal hover:underline">scheduling board</Link>{" "}
            to get assigned.
          </p>
        </div>
      ) : (
        <div className="space-y-7">

          {/* Now — in_progress */}
          <Section
            icon={<Wrench size={13} className="text-status-info" />}
            label="Now — In Progress"
            count={current.length}
            emptyMessage="No work orders currently in progress."
          >
            {current.map((wo) => (
              <WoCard key={wo.id} wo={wo} accent onAction={handleAction} onNote={handleNote} />
            ))}
          </Section>

          {/* Next — scheduled */}
          <Section
            icon={<Clock size={13} className="text-teal" />}
            label="Next — Scheduled"
            count={scheduled.length}
            emptyMessage="No scheduled work orders."
          >
            {scheduled.map((wo) => (
              <WoCard key={wo.id} wo={wo} onAction={handleAction} onNote={handleNote} />
            ))}
          </Section>

          {/* Queue — open/approved/triage */}
          <Section
            icon={<Inbox size={13} className="text-content-muted" />}
            label="Queue"
            count={queued.length}
            emptyMessage="No pending work orders in queue."
          >
            {queued.map((wo) => (
              <WoCard key={wo.id} wo={wo} onAction={handleAction} onNote={handleNote} />
            ))}
          </Section>

          {/* Stalled — waiting_parts / blocked */}
          {stalled.length > 0 && (
            <Section
              icon={<AlertTriangle size={13} className="text-status-critical" />}
              label="Stalled"
              count={stalled.length}
              emptyMessage=""
            >
              {stalled.map((wo) => (
                <WoCard key={wo.id} wo={wo} onAction={handleAction} onNote={handleNote} />
              ))}
            </Section>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <Section
              icon={<CheckCircle2 size={13} className="text-status-success" />}
              label="Completed"
              count={completed.length}
              emptyMessage=""
            >
              {completed.map((wo) => (
                <WoCard key={wo.id} wo={wo} onAction={handleAction} onNote={handleNote} />
              ))}
            </Section>
          )}

        </div>
      )}

    </PageContainer>
  );
}
