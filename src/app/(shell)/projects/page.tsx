import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MOCK_PROJECTS } from "@/lib/mock/projects";

export const metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <PageContainer maxWidth="wide">
      <SectionHeader
        title="Projects"
        subtitle={`${MOCK_PROJECTS.length} projects across your organization`}
      />

      <div className="rounded-[var(--radius-card)] border border-surface-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border bg-surface-overlay">
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-content-muted">Project</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-content-muted hidden md:table-cell">Phase</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-content-muted hidden lg:table-cell">PM</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-content-muted">Progress</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-content-muted">Status</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_PROJECTS.map((project) => (
              <tr key={project.id} className="border-b border-surface-border last:border-0 hover:bg-surface-overlay transition-colors">
                <td className="px-4 py-3.5">
                  <Link href={`/projects/${project.id}`} className="group block">
                    <p className="font-semibold text-content-primary group-hover:text-gold transition-colors">{project.name}</p>
                    <p className="text-xs text-content-muted mt-0.5">{project.location}</p>
                  </Link>
                </td>
                <td className="px-4 py-3.5 text-content-secondary hidden md:table-cell">{project.phase}</td>
                <td className="px-4 py-3.5 text-content-secondary hidden lg:table-cell">{project.pm_name}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-surface-overlay rounded-full overflow-hidden">
                      <div className="h-full bg-gold rounded-full" style={{ width: `${project.progress_pct}%` }} />
                    </div>
                    <span className="text-xs text-content-muted tabular-nums">{project.progress_pct}%</span>
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <StatusBadge status={project.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageContainer>
  );
}
