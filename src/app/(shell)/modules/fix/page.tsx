import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Wrench, AlertTriangle, Gauge, ArrowUpRight,
  X, ArrowLeft, Truck, Building2,
} from "lucide-react";
import { MOCK_ISSUES } from "@/lib/mock/issues";
import { MOCK_ASSETS } from "@/lib/mock/assets";
import { MOCK_PROJECTS } from "@/lib/mock/projects";

export const metadata = { title: "Fix" };

// ── source config ─────────────────────────────────────────────────────────────

const SOURCE_CONFIG: Record<string, { label: string; subtitle: string }> = {
  "issue-detail": {
    label:    "Issue Detail",
    subtitle: "Opened from Issue Detail",
  },
  "project-cc": {
    label:    "Project Command Center",
    subtitle: "Opened from Project Command Center",
  },
};

const FALLBACK_SOURCE = {
  label:    "External context",
  subtitle: "Opened with diagnostic context",
};

// ── module features ───────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon:  <AlertTriangle size={16} className="text-teal" />,
    title: "AI Diagnostics",
    desc:  "Fault code interpretation powered by AI — prioritized by impact and urgency.",
  },
  {
    icon:  <Gauge size={16} className="text-teal" />,
    title: "Fleet Priority",
    desc:  "Fleet-wide health ranking so you know which assets need attention first.",
  },
  {
    icon:  <Wrench size={16} className="text-teal" />,
    title: "Service History",
    desc:  "Centralized service log across all equipment — searchable, shareable, auditable.",
  },
];

// ── page ──────────────────────────────────────────────────────────────────────

type SearchParams = Promise<{ issueId?: string; assetId?: string; source?: string }>;

export default async function FixPage({ searchParams }: { searchParams: SearchParams }) {
  const params  = await searchParams;
  const issueId = typeof params.issueId === "string" ? params.issueId : null;
  const assetId = typeof params.assetId === "string" ? params.assetId : null;
  const source  = typeof params.source  === "string" ? params.source  : null;

  // Context resolution from mock data
  const issue   = issueId ? MOCK_ISSUES.find((i)   => i.id === issueId)   ?? null : null;
  const asset   = assetId ? MOCK_ASSETS.find((a)   => a.id === assetId)   ?? null : null;

  // Derive project from issue → asset → fallback
  const projectId = issue?.project_id ?? asset?.project_id ?? null;
  const project   = projectId ? MOCK_PROJECTS.find((p) => p.id === projectId) ?? null : null;

  const hasContext = !!(issue || asset);

  // Source label + subtitle
  const sourceConfig = source ? (SOURCE_CONFIG[source] ?? FALLBACK_SOURCE) : null;

  // Return link resolution
  let returnHref:  string | null = null;
  let returnLabel: string | null = null;

  if (source === "issue-detail") {
    returnHref  = issue ? `/issues/${issue.id}` : "/issues";
    returnLabel = issue ? "Back to Issue" : "Back to Issues";
  } else if (source === "project-cc") {
    returnHref  = project ? `/projects/${project.id}` : "/projects";
    returnLabel = project ? `Back to ${project.name}` : "Back to Projects";
  }

  return (
    <PageContainer>

      {/* ── Context Banner ─────────────────────────────────────────────── */}
      {hasContext && (
        <div className="mb-6 rounded-[var(--radius-card)] border border-teal/30 bg-teal/5 overflow-hidden">

          {/* Banner header */}
          <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal/15 border border-teal/25 flex items-center justify-center shrink-0 mt-0.5">
                <Wrench size={15} className="text-teal" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-teal mb-0.5">
                  Diagnostic context loaded
                </p>
                <p className="text-sm text-content-secondary">
                  {sourceConfig?.subtitle ?? "Opened with diagnostic context"}
                </p>
                {sourceConfig && (
                  <span className="mt-1.5 inline-block text-[10px] font-bold uppercase tracking-widest text-teal/80 border border-teal/20 bg-teal/10 rounded-[var(--radius-badge)] px-1.5 py-0.5">
                    {sourceConfig.label}
                  </span>
                )}
              </div>
            </div>
            <Link
              href="/modules/fix"
              className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-content-muted hover:text-content-primary hover:bg-surface-overlay transition-colors"
              aria-label="Clear context"
            >
              <X size={13} />
            </Link>
          </div>

          {/* Context details */}
          <div className="border-t border-teal/15 px-5 py-3.5 space-y-2.5">
            {issue && (
              <div className="flex items-center gap-3">
                <AlertTriangle size={13} className="text-content-muted shrink-0" />
                <span className="text-xs text-content-muted w-14 shrink-0">Issue</span>
                <span className="text-sm font-medium text-content-primary flex-1 min-w-0 truncate">
                  {issue.title}
                </span>
                <StatusBadge status={issue.severity} />
              </div>
            )}
            {asset && (
              <div className="flex items-center gap-3">
                <Truck size={13} className="text-content-muted shrink-0" />
                <span className="text-xs text-content-muted w-14 shrink-0">Asset</span>
                <span className="text-sm font-medium text-content-primary flex-1 min-w-0 truncate">
                  {asset.name}
                  <span className="text-content-muted font-normal"> · {asset.type}</span>
                </span>
                <StatusBadge status={asset.status} />
              </div>
            )}
            {project && (
              <div className="flex items-center gap-3">
                <Building2 size={13} className="text-content-muted shrink-0" />
                <span className="text-xs text-content-muted w-14 shrink-0">Project</span>
                <span className="text-sm text-content-secondary flex-1 min-w-0 truncate">
                  {project.name}
                </span>
              </div>
            )}
          </div>

          {/* Banner footer — return + clear */}
          <div className="border-t border-teal/15 px-5 py-3 flex items-center gap-3">
            {returnHref && returnLabel && (
              <Link
                href={returnHref}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal hover:opacity-80 transition-opacity"
              >
                <ArrowLeft size={12} />
                {returnLabel}
              </Link>
            )}
            {returnHref && <span className="text-surface-border">·</span>}
            <Link
              href="/modules/fix"
              className="text-xs text-content-muted hover:text-content-primary transition-colors"
            >
              Clear context
            </Link>
          </div>
        </div>
      )}

      {/* ── Module Hero ────────────────────────────────────────────────── */}
      <div className="rounded-[var(--radius-card)] border border-teal/30 bg-gradient-to-br from-surface-raised to-surface-overlay p-8 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 rounded-full bg-teal" />
          <span className="text-xs font-bold uppercase tracking-widest text-teal">Module · Diagnostic AI</span>
        </div>
        <h1 className="text-2xl font-bold text-content-primary">Fix</h1>
        <p className="text-content-secondary mt-2 max-w-md leading-relaxed">
          AI-powered equipment diagnostic intelligence. Proactive fault detection, fleet health scoring, and service coordination — before breakdowns happen.
        </p>
        <Link
          href="#"
          className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-lg bg-teal hover:opacity-90 text-content-inverse text-sm font-semibold transition-opacity"
        >
          Launch Fix <ArrowUpRight size={14} />
        </Link>
      </div>

      {/* ── Feature Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {FEATURES.map((f) => (
          <Card key={f.title} variant="default">
            <div className="w-8 h-8 rounded-lg bg-teal/10 border border-teal/20 flex items-center justify-center mb-3">
              {f.icon}
            </div>
            <p className="font-semibold text-content-primary text-sm">{f.title}</p>
            <p className="text-xs text-content-secondary mt-1.5 leading-relaxed">{f.desc}</p>
          </Card>
        ))}
      </div>

    </PageContainer>
  );
}
