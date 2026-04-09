"use client";

import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { useOrg } from "@/providers/OrgProvider";
import { Building, FolderOpen, User } from "lucide-react";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-surface-border last:border-0">
      <span className="text-sm text-content-muted">{label}</span>
      <span className="text-sm font-medium text-content-primary">{value}</span>
    </div>
  );
}

export default function OrganizationPage() {
  const { currentOrganization, currentProject, currentUser } = useOrg();

  return (
    <PageContainer>
      <SectionHeader title="Organization" subtitle="Your organization and active project context" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="default">
          <div className="flex items-center gap-2 mb-4">
            <Building size={14} className="text-gold" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-content-muted">Organization</span>
          </div>
          <InfoRow label="Name" value={currentOrganization.name} />
          <InfoRow label="Slug" value={currentOrganization.slug} />
          <InfoRow label="ID"   value={currentOrganization.id}   />
        </Card>

        <Card variant="default">
          <div className="flex items-center gap-2 mb-4">
            <FolderOpen size={14} className="text-teal" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-content-muted">Active Project</span>
          </div>
          <InfoRow label="Name" value={currentProject.name} />
          <InfoRow label="Slug" value={currentProject.slug} />
          <InfoRow label="ID"   value={currentProject.id}   />
        </Card>

        <Card variant="default">
          <div className="flex items-center gap-2 mb-4">
            <User size={14} className="text-blue-brand" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-content-muted">Current User</span>
          </div>
          <InfoRow label="Name"  value={currentUser.name}  />
          <InfoRow label="Email" value={currentUser.email} />
          <InfoRow label="Role"  value={currentUser.role}  />
        </Card>
      </div>
    </PageContainer>
  );
}
