import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { Wrench, Gauge, AlertTriangle, TrendingDown } from "lucide-react";

export const metadata = { title: "Equipment Intelligence" };

const FEATURES = [
  {
    icon: <Gauge size={18} className="text-teal" />,
    title: "Fleet Health Score",
    description: "Aggregated health scoring across all assets — updated from telematics and service records.",
    status: "Available via Fix",
  },
  {
    icon: <AlertTriangle size={18} className="text-status-warning" />,
    title: "Fault Monitoring",
    description: "Real-time fault code monitoring with AI-prioritized response recommendations.",
    status: "Available via Fix",
  },
  {
    icon: <Wrench size={18} className="text-gold" />,
    title: "Maintenance Scheduling",
    description: "Predictive maintenance scheduling based on operating hours, fault history, and OEM schedules.",
    status: "Coming to Fix",
  },
  {
    icon: <TrendingDown size={18} className="text-content-secondary" />,
    title: "Downtime Analytics",
    description: "Downtime tracking by asset, project, and cause — surfaced in Datum for cost attribution.",
    status: "Planned",
  },
];

export default function EquipmentIntelligencePage() {
  return (
    <PageContainer>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Wrench size={16} className="text-teal" />
          <span className="text-xs font-bold uppercase tracking-widest text-teal">Workflow</span>
        </div>
        <h1 className="text-2xl font-bold text-content-primary">Equipment Intelligence</h1>
        <p className="text-content-secondary mt-2 max-w-lg">
          Monitor fleet health, respond to faults before breakdowns happen, and build a predictive maintenance layer across all your equipment.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FEATURES.map((feature) => (
          <Card key={feature.title} variant="default">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-surface-overlay border border-surface-border flex items-center justify-center">
                {feature.icon}
              </div>
              <div>
                <p className="font-semibold text-content-primary text-sm">{feature.title}</p>
                <p className="text-xs text-content-secondary mt-1 leading-relaxed">{feature.description}</p>
                <span className="inline-block mt-2 text-[10px] font-semibold uppercase tracking-widest text-content-muted border border-surface-border px-2 py-0.5 rounded-[var(--radius-badge)]">
                  {feature.status}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
