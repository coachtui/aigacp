"use client";

import React from "react";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ModuleTile } from "@/components/ui/ModuleTile";
import { MODULE_REGISTRY } from "@/lib/modules/module-registry";
import { useModuleAccess } from "@/hooks/useModuleAccess";

export function ModuleLaunchpad() {
  const { isModuleEnabled, isRoleHidden } = useModuleAccess();

  const visibleModules = MODULE_REGISTRY.filter((mod) => {
    if (isRoleHidden(mod.id)) return false;
    return true;
  });

  return (
    <Card variant="default" className="!p-0">
      <div className="p-5 pb-3">
        <SectionHeader title="Module Launchpad" subtitle="Quick access to your active tools" />
      </div>
      <div className="px-5 pb-5 grid grid-cols-2 gap-3">
        {visibleModules.map((mod) => (
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
