"use client";

import { OrgProvider } from "@/providers/OrgProvider";
import { UIProvider } from "@/providers/UIProvider";
import { MxProvider } from "@/providers/MxProvider";
import { OpsProvider } from "@/providers/OpsProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { AssistantPanel } from "@/components/layout/AssistantPanel";
import { SearchModal } from "@/components/search/SearchModal";
import { useUI } from "@/providers/UIProvider";
import { useMx } from "@/providers/MxProvider";

/**
 * OpsProvider must sit inside MxProvider so it can wire work order creation
 * through to MX (MX is the single source of truth for all work orders).
 */
function OpsLayer({ children }: { children: React.ReactNode }) {
  const { createWorkOrder } = useMx();
  return (
    <OpsProvider onCreateMxWorkOrder={createWorkOrder}>
      {children}
    </OpsProvider>
  );
}

function ShellLayout({ children }: { children: React.ReactNode }) {
  const { sidebarCollapsed } = useUI();

  return (
    <>
      <Sidebar />
      <Topbar />

      {/* Main content area */}
      <main
        className={`min-h-screen pt-14 transition-all duration-200 ease-in-out pl-0 ${sidebarCollapsed ? "md:pl-16" : "md:pl-60"}`}
      >
        {/* Mobile: bottom nav offset */}
        <div className="pb-20 md:pb-0">
          {children}
        </div>
      </main>

      <AssistantPanel />
      <SearchModal />
      <MobileNav />
    </>
  );
}

export default function ShellRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <OrgProvider>
        <UIProvider>
          <MxProvider>
            <OpsLayer>
              <ShellLayout>{children}</ShellLayout>
            </OpsLayer>
          </MxProvider>
        </UIProvider>
      </OrgProvider>
    </ThemeProvider>
  );
}
