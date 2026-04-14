"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { MetricTile } from "@/components/ui/MetricTile";
import { MOCK_ISSUES } from "@/lib/mock/issues";
import { useOrg } from "@/providers/OrgProvider";
import { useMx } from "@/providers/MxProvider";
import { getRoleGroup } from "@/lib/utils/roles";
import type { Issue } from "@/types/domain";

// ── Mechanic variant: MX work order queue ─────────────────────────────────────

function WorkOrderQueueCard() {
  const { workOrders } = useMx();

  const active = workOrders.filter((wo) => wo.status !== "completed" && wo.status !== "canceled");

  const counts = {
    critical: active.filter((wo) => wo.priority === "critical").length,
    high:     active.filter((wo) => wo.priority === "high").length,
    medium:   active.filter((wo) => wo.priority === "medium").length,
    low:      active.filter((wo) => wo.priority === "low").length,
  };

  const total    = active.length;
  const hasCrit  = counts.critical > 0;

  const rows = [
    { label: "Critical", count: counts.critical, color: "text-status-critical", bar: "bg-status-critical", href: "/modules/mx/work-orders" },
    { label: "High",     count: counts.high,     color: "text-status-warning",  bar: "bg-status-warning",  href: "/modules/mx/work-orders" },
    { label: "Medium",   count: counts.medium,   color: "text-blue-brand",      bar: "bg-blue-brand",      href: "/modules/mx/work-orders" },
    { label: "Low",      count: counts.low,      color: "text-content-muted",   bar: "bg-surface-border",  href: "/modules/mx/work-orders" },
  ];

  return (
    <Card variant={hasCrit ? "accent-gold" : "default"}>
      <div className="flex items-start justify-between mb-4">
        <MetricTile
          label="Work Orders"
          value={total}
          accentColor={hasCrit ? "red" : "blue"}
        />
        <Link href="/modules/mx/work-orders" className="text-xs text-content-muted hover:text-gold transition-colors flex items-center gap-1">
          View all <ArrowRight size={11} />
        </Link>
      </div>

      <div className="space-y-1.5">
        {rows.map((row) => (
          <Link
            key={row.label}
            href={row.href}
            className="flex items-center gap-3 group rounded-md px-1 -mx-1 py-0.5 hover:bg-surface-overlay transition-colors"
          >
            <span className="text-xs text-content-muted w-14 shrink-0 group-hover:text-content-secondary transition-colors">{row.label}</span>
            <div className="flex-1 h-1.5 bg-surface-overlay rounded-full overflow-hidden">
              {row.count > 0 && total > 0 && (
                <div
                  className={`h-full ${row.bar} rounded-full`}
                  style={{ width: `${Math.min((row.count / total) * 100, 100)}%` }}
                />
              )}
            </div>
            <span className={`text-xs font-semibold tabular-nums w-4 text-right ${row.color}`}>{row.count}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

// ── Default: shell issues ─────────────────────────────────────────────────────

export function OpenIssuesCard() {
  const { role, currentProject } = useOrg();
  const roleGroup = getRoleGroup(role);

  if (roleGroup === "maintenance") return <WorkOrderQueueCard />;

  let open: Issue[] = MOCK_ISSUES.filter((i) => i.status !== "resolved");

  if (roleGroup === "field") {
    open = open.filter((i) => i.project_id === currentProject.id);
  } else if (role === "project_engineer") {
    open = [
      ...open.filter((i) => i.module === "inspect"),
      ...open.filter((i) => i.module !== "inspect"),
    ];
  }

  const label = "Open Issues";

  const counts = {
    critical: open.filter((i) => i.severity === "critical").length,
    high:     open.filter((i) => i.severity === "high").length,
    medium:   open.filter((i) => i.severity === "medium").length,
    low:      open.filter((i) => i.severity === "low").length,
  };

  const total = open.length;

  const severityRows = [
    { label: "Critical", count: counts.critical, color: "text-status-critical", bar: "bg-status-critical", href: "/issues?severity=critical" },
    { label: "High",     count: counts.high,     color: "text-status-warning",  bar: "bg-status-warning",  href: "/issues?severity=high"     },
    { label: "Medium",   count: counts.medium,   color: "text-blue-brand",      bar: "bg-blue-brand",      href: "/issues?severity=medium"   },
    { label: "Low",      count: counts.low,      color: "text-content-muted",   bar: "bg-surface-border",  href: "/issues?severity=low"      },
  ];

  return (
    <Card variant={counts.critical > 0 ? "accent-gold" : "default"}>
      <div className="flex items-start justify-between mb-4">
        <MetricTile
          label={label}
          value={total}
          accentColor={counts.critical > 0 ? "red" : "blue"}
        />
        <Link href="/issues" className="text-xs text-content-muted hover:text-gold transition-colors flex items-center gap-1">
          View all <ArrowRight size={11} />
        </Link>
      </div>

      <div className="space-y-1.5">
        {severityRows.map((row) => (
          <Link
            key={row.label}
            href={row.count > 0 ? row.href : "/issues"}
            className="flex items-center gap-3 group rounded-md px-1 -mx-1 py-0.5 hover:bg-surface-overlay transition-colors"
          >
            <span className="text-xs text-content-muted w-14 shrink-0 group-hover:text-content-secondary transition-colors">{row.label}</span>
            <div className="flex-1 h-1.5 bg-surface-overlay rounded-full overflow-hidden">
              {row.count > 0 && total > 0 && (
                <div
                  className={`h-full ${row.bar} rounded-full`}
                  style={{ width: `${Math.min((row.count / total) * 100, 100)}%` }}
                />
              )}
            </div>
            <span className={`text-xs font-semibold tabular-nums w-4 text-right ${row.color}`}>{row.count}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}
