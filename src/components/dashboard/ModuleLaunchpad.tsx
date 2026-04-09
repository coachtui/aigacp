"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ModuleTile } from "@/components/ui/ModuleTile";
import { MODULE_REGISTRY } from "@/lib/modules/module-registry";
import { useOrg } from "@/providers/OrgProvider";

export function ModuleLaunchpad() {
  const { isModuleEnabled } = useOrg();

  return (
    <Card variant="default" className="!p-0">
      <div className="p-5 pb-3">
        <SectionHeader title="Module Launchpad" subtitle="Quick access to your active tools" />
      </div>
      <div className="px-5 pb-5 grid grid-cols-2 gap-3">
        {MODULE_REGISTRY.map((mod) => (
          <ModuleTile
            key={mod.id}
            module={mod}
            isEnabled={isModuleEnabled(mod.id)}
          />
        ))}
      </div>
    </Card>
  );
}
