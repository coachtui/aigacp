"use client";

import { OrgProvider } from "@/providers/OrgProvider";
import { UIProvider } from "@/providers/UIProvider";
import { OpsProvider } from "@/providers/OpsProvider";
import { MxProvider } from "@/providers/MxProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav } from "@/components/layout/MobileNav";
import { AssistantPanel } from "@/components/layout/AssistantPanel";
import { SearchModal } from "@/components/search/SearchModal";
import { useUI } from "@/providers/UIProvider";

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
    <OrgProvider>
      <UIProvider>
        <OpsProvider>
          <MxProvider>
            <ShellLayout>{children}</ShellLayout>
          </MxProvider>
        </OpsProvider>
      </UIProvider>
    </OrgProvider>
  );
}
