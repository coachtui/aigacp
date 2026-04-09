"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MetricTile } from "@/components/ui/MetricTile";
import { MOCK_PROJECTS } from "@/lib/mock/projects";
import { useOrg } from "@/providers/OrgProvider";
import { getRoleGroup } from "@/lib/utils/roles";

export function ActiveProjectsCard() {
  const { role } = useOrg();
  const roleGroup = getRoleGroup(role);

  const activeProjects = MOCK_PROJECTS.filter((p) => p.status === "active" || p.status === "on_hold");
  const top3 = activeProjects.slice(0, 3);

  // Maintenance and field roles: de-emphasize multi-project view visually
  const deemphasized = roleGroup === "maintenance" || roleGroup === "field";

  return (
    <Card variant="default" className={deemphasized ? "opacity-75" : undefined}>
      <div className="flex items-start justify-between mb-4">
        <MetricTile
          label="Active Projects"
          value={activeProjects.length}
          accentColor={deemphasized ? "blue" : "gold"}
        />
        <Link href="/projects" className="text-xs text-content-muted hover:text-gold transition-colors flex items-center gap-1">
          View all <ArrowRight size={11} />
        </Link>
      </div>

      <div className="space-y-3">
        {top3.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`} className="group block space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-content-primary group-hover:text-gold transition-colors truncate">{project.name}</span>
              <StatusBadge status={project.status} />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 bg-surface-overlay rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold rounded-full transition-all duration-300"
                  style={{ width: `${project.progress_pct}%` }}
                />
              </div>
              <span className="text-xs text-content-muted tabular-nums shrink-0">{project.progress_pct}%</span>
            </div>
            <p className="text-xs text-content-muted">{project.phase} · {project.location}</p>
          </Link>
        ))}
      </div>
    </Card>
  );
}
