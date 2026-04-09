import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { MOCK_CREWS } from "@/lib/mock/crews";
import { HardHat, Users } from "lucide-react";

export const metadata = { title: "Crews" };

export default function CrewsPage() {
  const onSite  = MOCK_CREWS.filter((c) => c.status === "on_site").length;
  const offSite = MOCK_CREWS.filter((c) => c.status === "off_site").length;

  return (
    <PageContainer maxWidth="wide">
      <SectionHeader
        title="Crews"
        subtitle={`${MOCK_CREWS.length} crews · ${onSite} on site · ${offSite} off site`}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MOCK_CREWS.map((crew) => (
          <Card key={crew.id} variant="default">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-surface-overlay border border-surface-border flex items-center justify-center">
                <HardHat size={16} className="text-content-secondary" />
              </div>
              <StatusBadge status={crew.status} />
            </div>
            <p className="font-semibold text-content-primary text-sm">{crew.name}</p>
            <p className="text-xs text-content-muted mt-1">Lead: {crew.lead_name}</p>
            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-surface-border">
              <Users size={13} className="text-content-muted" />
              <span className="text-xs text-content-secondary">{crew.headcount} members</span>
            </div>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
