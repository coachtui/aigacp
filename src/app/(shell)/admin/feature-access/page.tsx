"use client";

import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { useOrg } from "@/providers/OrgProvider";
import { MODULE_REGISTRY } from "@/lib/modules/module-registry";
import { Check, X, Lock } from "lucide-react";

export default function FeatureAccessPage() {
  const { enabledModules, getModuleFeatures, isModuleEnabled } = useOrg();

  return (
    <PageContainer maxWidth="wide">
      <SectionHeader
        title="Feature Access"
        subtitle="Module and feature entitlements for your organization"
      />

      <div className="mb-4 p-3 rounded-lg bg-gold/10 border border-gold/25 text-sm text-gold">
        Feature access is managed at the organization level. Contact your account manager to enable or disable modules and features.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MODULE_REGISTRY.map((mod) => {
          const enabled   = isModuleEnabled(mod.id);
          const features  = getModuleFeatures(mod.id);
          const featureList = Object.entries(features);

          return (
            <Card key={mod.id} variant={enabled ? "default" : "default"} className={!enabled ? "opacity-60" : ""}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${enabled ? "bg-status-success" : "bg-status-critical"}`} />
                  <span className="font-bold text-content-primary">{mod.label}</span>
                </div>
                {enabled ? (
                  <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-status-success bg-status-success/10 border border-status-success/25 px-2 py-0.5 rounded-[var(--radius-badge)]">
                    <Check size={9} /> Enabled
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-content-muted bg-surface-overlay border border-surface-border px-2 py-0.5 rounded-[var(--radius-badge)]">
                    <Lock size={9} /> Locked
                  </span>
                )}
              </div>

              {featureList.length > 0 && (
                <div className="space-y-2">
                  {featureList.map(([feature, active]) => (
                    <div key={feature} className="flex items-center justify-between py-1.5 border-b border-surface-border last:border-0">
                      <span className="text-sm text-content-secondary capitalize">{feature.replace(/_/g, " ")}</span>
                      {active ? (
                        <Check size={13} className="text-status-success" />
                      ) : (
                        <X     size={13} className="text-content-muted"  />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Disabled modules */}
      {MODULE_REGISTRY.filter((m) => !enabledModules.includes(m.id)).length > 0 && (
        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-widest text-content-muted mb-3">Locked Modules</p>
          <div className="rounded-[var(--radius-card)] border border-surface-border bg-surface-raised p-4 text-sm text-content-muted">
            {MODULE_REGISTRY.filter((m) => !enabledModules.includes(m.id)).map((m) => m.label).join(", ")} — contact your account manager to unlock.
          </div>
        </div>
      )}
    </PageContainer>
  );
}
