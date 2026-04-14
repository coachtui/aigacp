"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Inbox } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { MetricTile } from "@/components/ui/MetricTile";
import { useMx } from "@/providers/MxProvider";
import { useOrg } from "@/providers/OrgProvider";
import { STATUS_BADGE, STATUS_LABELS, PRIORITY_BADGE, PRIORITY_LABELS } from "@/lib/mx/rules";
import type { MxWorkOrder } from "@/lib/mx/types";

const PRIORITY_WEIGHT: Record<string, number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};

function sortMyWork(wos: MxWorkOrder[]): MxWorkOrder[] {
  const ORDER: Record<string, number> = {
    in_progress: 0,
    scheduled:   1,
  };
  return [...wos].sort((a, b) => {
    const ao = ORDER[a.status] ?? 2;
    const bo = ORDER[b.status] ?? 2;
    if (ao !== bo) return ao - bo;
    return (PRIORITY_WEIGHT[a.priority] ?? 3) - (PRIORITY_WEIGHT[b.priority] ?? 3);
  });
}

export function MyWorkCard() {
  const { workOrders } = useMx();
  const { currentUser } = useOrg();

  const myOpen = useMemo(
    () =>
      sortMyWork(
        workOrders.filter(
          (wo) =>
            wo.assignedMechanicIds.includes(currentUser.id) &&
            wo.status !== "completed" &&
            wo.status !== "canceled",
        ),
      ),
    [workOrders, currentUser.id],
  );

  const hasCritical = myOpen.some((wo) => wo.priority === "critical");
  const shown       = myOpen.slice(0, 4);

  return (
    <Card variant={hasCritical ? "accent-gold" : "default"}>
      <div className="flex items-start justify-between mb-4">
        <MetricTile
          label="My Work"
          value={myOpen.length}
          accentColor={hasCritical ? "red" : "blue"}
        />
        <Link
          href="/modules/mx/my-work"
          className="text-xs text-content-muted hover:text-gold transition-colors flex items-center gap-1"
        >
          View all <ArrowRight size={11} />
        </Link>
      </div>

      {myOpen.length === 0 ? (
        <div className="flex items-center gap-2 text-xs text-content-muted py-1">
          <Inbox size={13} />
          No work assigned
        </div>
      ) : (
        <div className="space-y-1.5">
          {shown.map((wo) => (
            <Link
              key={wo.id}
              href={`/modules/mx/work-orders/${wo.id}`}
              className="flex items-center gap-2 group rounded-md px-1 -mx-1 py-0.5 hover:bg-surface-overlay transition-colors"
            >
              <span
                className={`text-[10px] font-bold border rounded-[var(--radius-badge)] px-1 py-px shrink-0 ${PRIORITY_BADGE[wo.priority]}`}
              >
                {PRIORITY_LABELS[wo.priority][0]}
              </span>
              <span className="flex-1 text-xs text-content-secondary truncate group-hover:text-content-primary transition-colors leading-snug">
                {wo.equipmentLabel ?? wo.title}
              </span>
              <span
                className={`text-[10px] font-semibold border rounded-[var(--radius-badge)] px-1.5 py-px shrink-0 ${STATUS_BADGE[wo.status]}`}
              >
                {STATUS_LABELS[wo.status]}
              </span>
            </Link>
          ))}
          {myOpen.length > 4 && (
            <p className="text-[10px] text-content-muted pl-1">
              +{myOpen.length - 4} more
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
