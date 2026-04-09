"use client";

import { PageContainer } from "@/components/ui/PageContainer";
import { ActiveProjectsCard } from "@/components/dashboard/ActiveProjectsCard";
import { OpenIssuesCard } from "@/components/dashboard/OpenIssuesCard";
import { AlertsCard } from "@/components/dashboard/AlertsCard";
import { ModuleLaunchpad } from "@/components/dashboard/ModuleLaunchpad";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { useOrg } from "@/providers/OrgProvider";

function ContextBanner() {
  const { currentOrganization, currentProject, currentUser } = useOrg();
  const firstName = currentUser.name.split(" ")[0];

  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-content-primary">
        Welcome back, {firstName}
      </h2>
      <p className="text-sm text-content-muted mt-0.5">
        {currentOrganization.name} &middot; {currentProject.name}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <PageContainer maxWidth="wide">
      <ContextBanner />

      {/* Metric row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <ActiveProjectsCard />
        <OpenIssuesCard />
        <AlertsCard />
      </div>

      {/* Lower section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2">
          <ModuleLaunchpad />
        </div>
        <div className="lg:col-span-3">
          <RecentActivityFeed />
        </div>
      </div>
    </PageContainer>
  );
}
