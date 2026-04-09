import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { MapPin, ClipboardList, HardHat, Clock } from "lucide-react";

export const metadata = { title: "Field Operations" };

const FEATURES = [
  {
    icon: <MapPin size={18} className="text-gold" />,
    title: "Site Presence",
    description: "Real-time crew location and site check-in status across all active projects.",
    status: "Available via CRU",
  },
  {
    icon: <ClipboardList size={18} className="text-blue-brand" />,
    title: "Field Inspections",
    description: "Assign, track, and sign off on inspections from the field — no desk required.",
    status: "Available via Inspect",
  },
  {
    icon: <HardHat size={18} className="text-teal" />,
    title: "Crew Dispatch",
    description: "Schedule and dispatch crews to project zones with real-time confirmation.",
    status: "Coming to CRU",
  },
  {
    icon: <Clock size={18} className="text-content-secondary" />,
    title: "Daily Logs",
    description: "Automated daily log generation from field activity — crew hours, equipment, weather.",
    status: "Planned",
  },
];

export default function FieldOperationsPage() {
  return (
    <PageContainer>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <MapPin size={16} className="text-gold" />
          <span className="text-xs font-bold uppercase tracking-widest text-gold">Workflow</span>
        </div>
        <h1 className="text-2xl font-bold text-content-primary">Field Operations</h1>
        <p className="text-content-secondary mt-2 max-w-lg">
          Coordinate everything happening in the field — crews, inspections, dispatching, and daily logs — from a single workflow view.
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
