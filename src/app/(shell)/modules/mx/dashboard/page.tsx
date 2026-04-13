"use client";

import { useMemo } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { useMx } from "@/providers/MxProvider";
import {
  STATUS_LABELS, STATUS_BADGE, PRIORITY_BADGE, PRIORITY_LABELS, ACTIVE_STATUSES,
} from "@/lib/mx/rules";
import type { MxWorkOrder } from "@/lib/mx/types";
import {
  ArrowLeft, AlertTriangle, Inbox, Wrench,
  Clock, PackageX, ShieldAlert, User,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_WEIGHT: Record<string, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};

function topByPriority(wos: MxWorkOrder[], n = 5): MxWorkOrder[] {
  return [...wos]
    .sort((a, b) => {
      if (a.opsBlocking !== b.opsBlocking) return a.opsBlocking ? -1 : 1;
      return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
    })
    .slice(0, n);
}

type Urgency = "overdue" | "today" | "tomorrow";

function getUrgency(neededByDate?: string): Urgency | null {
  if (!neededByDate) return null;
  const today    = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split("T")[0];
  if (neededByDate < today)      return "overdue";
  if (neededByDate === today)    return "today";
  if (neededByDate === tomorrow) return "tomorrow";
  return null;
}

const URGENCY_STYLE: Record<Urgency, string> = {
  overdue:  "text-status-critical bg-status-critical/10 border-status-critical/30 font-bold",
  today:    "text-gold bg-gold/10 border-gold/30 font-semibold",
  tomorrow: "text-content-muted bg-surface-overlay border-surface-border",
};

const URGENCY_LABEL: Record<Urgency, string> = {
  overdue: "Overdue", today: "Due Today", tomorrow: "Tomorrow",
};

// ── Summary Tile ──────────────────────────────────────────────────────────────

function SummaryTile({
  icon, label, value, href, urgent,
}: {
  icon:    React.ReactNode;
  label:   string;
  value:   number;
  href?:   string;
  urgent?: boolean;
}) {
  const inner = (
    <Card
      variant="default"
      className={`flex items-center gap-3 ${href ? "hover:border-teal/25 transition-colors cursor-pointer" : ""} ${urgent && value > 0 ? "border-status-critical/30 bg-status-critical/5" : ""}`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
        urgent && value > 0
          ? "bg-status-critical/10 border border-status-critical/20"
          : "bg-surface-overlay border border-surface-border"
      }`}>
        {icon}
      </div>
      <div>
        <p className={`text-2xl font-bold ${urgent && value > 0 ? "text-status-critical" : "text-content-primary"}`}>{value}</p>
        <p className="text-[10px] text-content-muted font-medium uppercase tracking-widest">{label}</p>
      </div>
    </Card>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

// ── WO Row ────────────────────────────────────────────────────────────────────

function WoRow({ wo }: { wo: MxWorkOrder }) {
  const urgency = getUrgency(wo.neededByDate);
  return (
    <Link
      href={`/modules/mx/work-orders/${wo.id}`}
      className="flex items-center gap-2 px-3 py-2.5 border-b border-surface-border last:border-0 hover:bg-surface-overlay transition-colors group"
    >
      {/* Priority + status */}
      <span className={`text-[9px] font-bold uppercase tracking-widest border rounded px-1 py-0.5 flex-shrink-0 ${PRIORITY_BADGE[wo.priority]}`}>
        {PRIORITY_LABELS[wo.priority]}
      </span>
      <span className={`text-[9px] font-semibold border rounded px-1 py-0.5 flex-shrink-0 ${STATUS_BADGE[wo.status]}`}>
        {STATUS_LABELS[wo.status]}
      </span>

      {/* Title */}
      <p className="text-xs text-content-primary font-medium truncate flex-1">{wo.title}</p>

      {/* Right-side metadata */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {urgency && (
          <span className={`text-[9px] border rounded px-1 py-0.5 ${URGENCY_STYLE[urgency]}`}>
            {URGENCY_LABEL[urgency]}
          </span>
        )}
        {wo.opsBlocking && (
          <AlertTriangle size={11} className="text-status-critical" />
        )}
        {wo.equipmentLabel && (
          <p className="text-[10px] text-content-muted hidden sm:block truncate max-w-[110px]">{wo.equipmentLabel}</p>
        )}
        {wo.assignedMechanicIds.length > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] text-content-muted">
            <User size={9} />
            {wo.assignedMechanicIds.length}
          </span>
        )}
        <span className="text-[10px] text-content-muted opacity-0 group-hover:opacity-100 transition-opacity">→</span>
      </div>
    </Link>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

function WoSection({
  icon, label, wos, viewAllHref, emptyMessage,
}: {
  icon:         React.ReactNode;
  label:        string;
  wos:          MxWorkOrder[];
  viewAllHref:  string;
  emptyMessage: string;
}) {
  const overdueCount = wos.filter((wo) => getUrgency(wo.neededByDate) === "overdue").length;

  return (
    <Card variant="default" className="p-0 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-border">
        {icon}
        <span className="text-xs font-bold uppercase tracking-widest text-content-muted">{label}</span>
        <span className="ml-1 text-[10px] font-bold text-content-muted bg-surface-overlay border border-surface-border rounded-full px-1.5 py-0.5">
          {wos.length}
        </span>
        {overdueCount > 0 && (
          <span className="text-[10px] font-bold text-status-critical bg-status-critical/10 border border-status-critical/30 rounded-full px-1.5 py-0.5">
            {overdueCount} overdue
          </span>
        )}
        <Link href={viewAllHref} className="text-[10px] text-teal hover:underline font-semibold ml-auto">
          View all
        </Link>
      </div>
      {wos.length === 0 ? (
        <p className="text-xs text-content-muted text-center py-6">{emptyMessage}</p>
      ) : (
        <div>
          {topByPriority(wos).map((wo) => <WoRow key={wo.id} wo={wo} />)}
          {wos.length > 5 && (
            <div className="px-3 py-2 border-t border-surface-border">
              <Link href={viewAllHref} className="text-[10px] text-teal hover:underline">
                +{wos.length - 5} more
              </Link>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MxDashboardPage() {
  const { workOrders } = useMx();

  const active = useMemo(
    () => workOrders.filter((wo) => ACTIVE_STATUSES.includes(wo.status)),
    [workOrders],
  );

  const unassigned   = useMemo(() => active.filter((wo) => wo.assignedMechanicIds.length === 0), [active]);
  const inProgress   = useMemo(() => active.filter((wo) => wo.status === "in_progress"),          [active]);
  const waitingParts = useMemo(() => active.filter((wo) => wo.status === "waiting_parts"),        [active]);
  const opsBlocking  = useMemo(() => active.filter((wo) => wo.opsBlocking),                       [active]);
  const blockedWos   = useMemo(() => active.filter((wo) => wo.status === "blocked"),              [active]);
  const scheduled    = useMemo(() => active.filter((wo) => wo.status === "scheduled"),             [active]);

  const totalOverdue = useMemo(
    () => active.filter((wo) => getUrgency(wo.neededByDate) === "overdue").length,
    [active],
  );

  return (
    <PageContainer>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/modules/mx" className="text-content-muted hover:text-content-primary transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-content-primary">MX Dashboard</h1>
          <p className="text-xs text-content-muted">
            {active.length} active work order{active.length !== 1 ? "s" : ""}
            {totalOverdue > 0 && (
              <span className="ml-2 text-status-critical font-semibold">{totalOverdue} overdue</span>
            )}
          </p>
        </div>
        <Link href="/modules/mx/work-orders" className="ml-auto text-xs text-teal hover:underline font-semibold">
          All work orders →
        </Link>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <SummaryTile
          icon={<Inbox size={14} className="text-content-muted" />}
          label="Unassigned"
          value={unassigned.length}
          href="/modules/mx/scheduling"
          urgent={unassigned.some((wo) => wo.priority === "critical" || wo.priority === "high")}
        />
        <SummaryTile
          icon={<Wrench size={14} className="text-status-info" />}
          label="In Progress"
          value={inProgress.length}
          href="/modules/mx/work-orders"
        />
        <SummaryTile
          icon={<PackageX size={14} className="text-gold" />}
          label="Waiting Parts"
          value={waitingParts.length}
          href="/modules/mx/work-orders"
        />
        <SummaryTile
          icon={<ShieldAlert size={14} className={opsBlocking.length > 0 ? "text-status-critical" : "text-content-muted"} />}
          label="OPS Blocking"
          value={opsBlocking.length}
          href="/modules/mx/readiness"
          urgent={opsBlocking.length > 0}
        />
      </div>

      {/* Alerts */}
      <div className="space-y-4">

        {opsBlocking.length > 0 && (
          <div className="flex items-start gap-3 p-3 bg-status-critical/5 border border-status-critical/20 rounded-[var(--radius-card)]">
            <AlertTriangle size={14} className="text-status-critical flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-status-critical">
                {opsBlocking.length} OPS-blocking work order{opsBlocking.length !== 1 ? "s" : ""} active
              </p>
              <p className="text-[10px] text-content-muted mt-0.5">
                <Link href="/modules/mx/readiness" className="text-teal hover:underline">View equipment readiness →</Link>
              </p>
            </div>
          </div>
        )}

        {/* Blocked */}
        {blockedWos.length > 0 && (
          <WoSection
            icon={<AlertTriangle size={12} className="text-status-critical" />}
            label="Blocked"
            wos={blockedWos}
            viewAllHref="/modules/mx/work-orders"
            emptyMessage="No blocked work orders."
          />
        )}

        {/* Unassigned */}
        <WoSection
          icon={<Inbox size={12} className="text-content-muted" />}
          label="Unassigned"
          wos={unassigned}
          viewAllHref="/modules/mx/scheduling"
          emptyMessage="All active WOs are assigned."
        />

        {/* In Progress */}
        <WoSection
          icon={<Wrench size={12} className="text-status-info" />}
          label="In Progress"
          wos={inProgress}
          viewAllHref="/modules/mx/work-orders"
          emptyMessage="No work orders currently in progress."
        />

        {/* Waiting Parts */}
        {waitingParts.length > 0 && (
          <WoSection
            icon={<PackageX size={12} className="text-gold" />}
            label="Waiting on Parts"
            wos={waitingParts}
            viewAllHref="/modules/mx/work-orders"
            emptyMessage="No work orders waiting on parts."
          />
        )}

        {/* Scheduled */}
        {scheduled.length > 0 && (
          <WoSection
            icon={<Clock size={12} className="text-teal" />}
            label="Scheduled"
            wos={scheduled}
            viewAllHref="/modules/mx/scheduling"
            emptyMessage="No scheduled work orders."
          />
        )}

      </div>
    </PageContainer>
  );
}
