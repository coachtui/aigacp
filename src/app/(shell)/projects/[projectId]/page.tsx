import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, ArrowRight, MapPin, User, Calendar,
  Wrench, Users, ClipboardCheck, ChevronRight,
  AlertCircle, Bell, Truck,
} from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ActivityFeedItem } from "@/components/ui/ActivityFeedItem";
import { MOCK_PROJECTS } from "@/lib/mock/projects";
import { MOCK_ISSUES } from "@/lib/mock/issues";
import { MOCK_ALERTS } from "@/lib/mock/alerts";
import { MOCK_ACTIVITY } from "@/lib/mock/activity";
import { MOCK_ASSETS } from "@/lib/mock/assets";
import { MOCK_CREWS } from "@/lib/mock/crews";
import type { ActivityEvent } from "@/types/domain";

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getActivityHref(event: ActivityEvent): string | undefined {
  if (event.target_type === "issue"   && event.target_id) return `/issues/${event.target_id}`;
  if (event.target_type === "alert"   && event.target_id) return `/alerts/${event.target_id}`;
  if (event.target_type === "project" && event.target_id) return `/projects/${event.target_id}`;
  return undefined;
}

// ── severity coloring ─────────────────────────────────────────────────────────

const ISSUE_SEVERITY_DOT: Record<string, string> = {
  critical: "bg-status-critical",
  high:     "bg-status-warning",
  medium:   "bg-blue-brand",
  low:      "bg-content-muted",
};

const SEVERITY_PILL: Record<string, string> = {
  critical: "text-status-critical bg-status-critical/10 border-status-critical/20",
  high:     "text-status-warning  bg-status-warning/10  border-status-warning/20",
  medium:   "text-blue-brand      bg-blue-brand/10       border-blue-brand/20",
  low:      "text-content-muted   bg-surface-overlay     border-surface-border",
};

const ALERT_SEVERITY_DOT: Record<string, string> = {
  critical: "bg-status-critical",
  warning:  "bg-status-warning",
  info:     "bg-blue-brand",
};

// ── quick actions ─────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  {
    label:       "CRU",
    description: "Crew operations",
    href:        "/modules/cru",
    icon:        <Users size={15} className="text-gold" />,
    hover:       "hover:border-gold/40 hover:bg-gold/5",
  },
  {
    label:       "Fix",
    description: "Equipment diagnostics",
    href:        "/modules/fix",
    icon:        <Wrench size={15} className="text-teal" />,
    hover:       "hover:border-teal/40 hover:bg-teal/5",
  },
  {
    label:       "Inspect",
    description: "Field inspections",
    href:        "/modules/inspect",
    icon:        <ClipboardCheck size={15} className="text-blue-brand" />,
    hover:       "hover:border-blue-brand/40 hover:bg-blue-brand/5",
  },
  {
    label:       "Datum",
    description: "Geospatial layout",
    href:        "/modules/datum",
    icon:        <MapPin size={15} className="text-teal" />,
    hover:       "hover:border-teal/40 hover:bg-teal/5",
  },
];

// ── page ──────────────────────────────────────────────────────────────────────

type Params = Promise<{ projectId: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { projectId } = await params;
  const project = MOCK_PROJECTS.find((p) => p.id === projectId);
  return { title: project ? `${project.name} — Command Center` : "Project Not Found" };
}

export default async function ProjectCommandCenterPage({ params }: { params: Params }) {
  const { projectId } = await params;
  const project = MOCK_PROJECTS.find((p) => p.id === projectId);

  if (!project) notFound();

  // Project-scoped data
  const projectIssues   = MOCK_ISSUES.filter((i) => i.project_id === projectId);
  const projectAlerts   = MOCK_ALERTS.filter((a) => a.project_id === projectId);
  const projectActivity = MOCK_ACTIVITY.filter((e) => e.project_id === projectId).slice(0, 8);
  const projectAssets   = MOCK_ASSETS.filter((a) => a.project_id === projectId);
  const projectCrews    = MOCK_CREWS.filter((c) => c.project_id === projectId);

  // Derived
  const openIssues   = projectIssues.filter((i) => i.status !== "resolved");
  const unreadAlerts = projectAlerts.filter((a) => !a.is_read);
  const topIssues    = openIssues.slice(0, 5);
  const topAlerts    = projectAlerts.slice(0, 4);

  const severityCount = {
    critical: openIssues.filter((i) => i.severity === "critical").length,
    high:     openIssues.filter((i) => i.severity === "high").length,
    medium:   openIssues.filter((i) => i.severity === "medium").length,
    low:      openIssues.filter((i) => i.severity === "low").length,
  };

  const hasCritical = severityCount.critical > 0;

  return (
    <PageContainer maxWidth="wide">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/projects"
          className="flex items-center gap-1.5 text-sm text-content-muted hover:text-content-primary transition-colors"
        >
          <ArrowLeft size={14} />
          Projects
        </Link>
        <span className="text-content-muted">/</span>
        <span className="text-sm text-content-secondary truncate">{project.name}</span>
      </div>

      {/* ── Project Header ─────────────────────────────────────────────────── */}
      <Card variant="default" className="mb-6">
        <div className="flex flex-col md:flex-row md:items-start gap-5">

          {/* Gold accent bar */}
          <div className="hidden md:block w-0.5 self-stretch rounded-full bg-gold/50 shrink-0" />

          {/* Identity */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <StatusBadge status={project.status} size="md" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-content-muted">
                {project.phase}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-content-primary leading-tight mb-3">
              {project.name}
            </h1>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-content-muted">
              <span className="flex items-center gap-1.5">
                <MapPin size={11} />
                {project.location}
              </span>
              <span className="flex items-center gap-1.5">
                <User size={11} />
                PM: <span className="text-content-secondary font-medium ml-0.5">{project.pm_name}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={11} />
                {formatDate(project.start_date)} – {formatDate(project.end_date)}
              </span>
            </div>
          </div>

          {/* Progress */}
          <div className="shrink-0 md:text-right">
            <p className="text-[11px] font-bold uppercase tracking-widest text-content-muted mb-1.5">Progress</p>
            <p className="text-4xl font-bold text-gold tabular-nums leading-none mb-2.5">
              {project.progress_pct}
              <span className="text-xl text-gold/50">%</span>
            </p>
            <div className="w-32 h-1.5 bg-surface-overlay rounded-full overflow-hidden ml-auto">
              <div
                className="h-full bg-gold rounded-full"
                style={{ width: `${project.progress_pct}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* ── Main Grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* ── Left column — what's happening ────────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">

          {/* Priority Issues */}
          <Card variant="default" className="!p-0">
            <div className="p-5 pb-3">
              <SectionHeader
                title="Priority Issues"
                subtitle={`${openIssues.length} open issue${openIssues.length !== 1 ? "s" : ""}`}
                action={
                  <Link href="/issues" className="text-xs text-content-muted hover:text-gold transition-colors flex items-center gap-1">
                    View all <ArrowRight size={11} />
                  </Link>
                }
              />
              {openIssues.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {(["critical", "high", "medium", "low"] as const).map((sev) =>
                    severityCount[sev] > 0 ? (
                      <span
                        key={sev}
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-[var(--radius-badge)] uppercase tracking-wide border ${SEVERITY_PILL[sev]}`}
                      >
                        {severityCount[sev]} {sev}
                      </span>
                    ) : null
                  )}
                </div>
              )}
            </div>

            {topIssues.length === 0 ? (
              <div className="px-5 pb-5 text-sm text-content-muted italic">No open issues on this project.</div>
            ) : (
              <div>
                {topIssues.map((issue) => {
                  const fixHref = issue.asset_id
                    ? `/modules/fix?issueId=${issue.id}&assetId=${issue.asset_id}&source=project-cc`
                    : null;

                  return (
                    /* Stretched-link pattern: absolute anchor covers row; Fix button sits above via z-10 */
                    <div key={issue.id} className="relative group border-t border-surface-border hover:bg-surface-overlay transition-colors">
                      <Link href={`/issues/${issue.id}`} className="absolute inset-0" aria-label={issue.title} />
                      <div className="relative flex items-center gap-3 px-5 py-3 pointer-events-none">
                        <div className={`shrink-0 w-1.5 h-1.5 rounded-full ${ISSUE_SEVERITY_DOT[issue.severity] ?? "bg-content-muted"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-content-primary group-hover:text-white transition-colors truncate">
                            {issue.title}
                          </p>
                          {issue.asset_name && (
                            <p className="text-xs text-content-muted mt-0.5 truncate">{issue.asset_name}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <StatusBadge status={issue.severity} />
                          <StatusBadge status={issue.status} />
                        </div>
                      </div>
                      {/* Fix CTA — z-10 floats above the absolute row link */}
                      {fixHref && (
                        <div className="absolute right-8 top-1/2 -translate-y-1/2 z-10 pointer-events-auto">
                          <Link
                            href={fixHref}
                            className="text-[11px] font-semibold text-teal border border-teal/30 bg-teal/5 hover:bg-teal/20 px-1.5 py-0.5 rounded transition-colors"
                          >
                            Fix →
                          </Link>
                        </div>
                      )}
                      <ChevronRight
                        size={12}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-content-muted group-hover:text-content-secondary transition-colors pointer-events-none"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Active Alerts */}
          <Card variant="default" className="!p-0">
            <div className="p-5 pb-3">
              <SectionHeader
                title="Active Alerts"
                subtitle={unreadAlerts.length > 0 ? `${unreadAlerts.length} unread` : "All caught up"}
                action={
                  <Link href="/alerts" className="text-xs text-content-muted hover:text-gold transition-colors flex items-center gap-1">
                    View all <ArrowRight size={11} />
                  </Link>
                }
              />
            </div>

            {topAlerts.length === 0 ? (
              <div className="px-5 pb-5 text-sm text-content-muted italic">No alerts for this project.</div>
            ) : (
              <div>
                {topAlerts.map((alert) => (
                  <Link key={alert.id} href={`/alerts/${alert.id}`} className="group block">
                    <div className="flex items-start gap-3 px-5 py-3 border-t border-surface-border hover:bg-surface-overlay transition-colors">
                      <div className={`shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full ${ALERT_SEVERITY_DOT[alert.severity] ?? "bg-content-muted"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-content-primary group-hover:text-white transition-colors leading-snug">
                          {alert.message}
                        </p>
                        {!alert.is_read && (
                          <span className="mt-1 inline-block text-[10px] font-bold uppercase tracking-widest text-gold">
                            Unread
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 text-[11px] text-content-muted tabular-nums">
                        {relativeTime(alert.created_at)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Project Activity */}
          <Card variant="default" className="!p-0">
            <div className="p-5 pb-2">
              <SectionHeader
                title="Project Activity"
                subtitle="Recent events on this job"
                action={
                  <Link href="/activity" className="text-xs text-content-muted hover:text-gold transition-colors flex items-center gap-1">
                    View all <ArrowRight size={11} />
                  </Link>
                }
              />
            </div>

            {projectActivity.length === 0 ? (
              <div className="px-5 pb-5 text-sm text-content-muted italic">No activity recorded for this project.</div>
            ) : (
              <div className="px-5 pb-3">
                {projectActivity.map((event) => (
                  <ActivityFeedItem
                    key={event.id}
                    event={event}
                    href={getActivityHref(event)}
                  />
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* ── Right column — overview + actions ─────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Project Snapshot */}
          <Card variant="default">
            <p className="text-[11px] font-bold uppercase tracking-widest text-content-muted mb-4">Project Snapshot</p>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                {
                  label: "Assets",
                  value: projectAssets.length,
                  icon:  <Truck size={13} className="text-content-muted" />,
                  accent: false,
                },
                {
                  label: "Crews",
                  value: projectCrews.length,
                  icon:  <Users size={13} className="text-content-muted" />,
                  accent: false,
                },
                {
                  label: "Open Issues",
                  value: openIssues.length,
                  icon:  <AlertCircle size={13} className={hasCritical ? "text-status-critical" : "text-content-muted"} />,
                  accent: hasCritical,
                },
                {
                  label: "Alerts",
                  value: projectAlerts.length,
                  icon:  <Bell size={13} className={unreadAlerts.length > 0 ? "text-status-warning" : "text-content-muted"} />,
                  accent: unreadAlerts.length > 0,
                },
              ].map(({ label, value, icon, accent }) => (
                <div
                  key={label}
                  className={`rounded-lg p-3 border ${accent ? "border-status-critical/20 bg-status-critical/5" : "border-surface-border bg-surface-overlay"}`}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    {icon}
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-content-muted">{label}</span>
                  </div>
                  <p className={`text-2xl font-bold tabular-nums ${accent ? "text-status-critical" : "text-content-primary"}`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card variant="default" className="!p-0">
            <div className="p-5 pb-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-content-muted">Project Actions</p>
              <p className="text-xs text-content-muted mt-0.5">Launch a module for this job</p>
            </div>
            <div className="px-5 pb-5 grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className={`group flex items-start gap-2.5 p-3 rounded-lg border border-surface-border bg-surface-overlay transition-colors ${action.hover}`}
                >
                  <div className="mt-0.5 shrink-0">{action.icon}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-content-primary group-hover:text-white transition-colors">
                      {action.label}
                    </p>
                    <p className="text-[11px] text-content-muted mt-0.5 leading-snug">{action.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </Card>

          {/* Field Assets */}
          {projectAssets.length > 0 && (
            <Card variant="default" className="!p-0">
              <div className="p-5 pb-3">
                <SectionHeader
                  title="Field Assets"
                  subtitle={`${projectAssets.length} on this project`}
                />
              </div>
              <div>
                {projectAssets.slice(0, 4).map((asset) => (
                  <div key={asset.id} className="flex items-center gap-3 px-5 py-2.5 border-t border-surface-border">
                    <Truck size={13} className="shrink-0 text-content-muted" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-content-primary truncate">{asset.name}</p>
                      <p className="text-xs text-content-muted">{asset.type}</p>
                    </div>
                    <StatusBadge status={asset.status} />
                  </div>
                ))}
              </div>
            </Card>
          )}

        </div>
      </div>
    </PageContainer>
  );
}
