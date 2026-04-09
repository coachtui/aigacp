"use client";

import React, { createContext, useContext, useState } from "react";
import type { OrgConfig, ProjectContext, ModuleId } from "@/types/org";
import type { ModuleFeatureMap } from "@/types/org";
import { getOrgConfig, MOCK_PROJECTS } from "@/lib/config/org";

interface OrgContextValue {
  currentOrganization: OrgConfig["org"];
  currentProject:      ProjectContext;
  currentUser:         OrgConfig["currentUser"];
  enabledModules:      ModuleId[];
  features:            OrgConfig["features"];
  availableProjects:   ProjectContext[];
  setCurrentProject:   (project: ProjectContext) => void;
  isModuleEnabled:     (id: ModuleId) => boolean;
  getModuleFeatures:   (id: ModuleId) => ModuleFeatureMap;
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<OrgConfig>(getOrgConfig);

  function setCurrentProject(project: ProjectContext) {
    setConfig((prev) => ({ ...prev, currentProject: project }));
  }

  function isModuleEnabled(id: ModuleId): boolean {
    return config.enabledModules.includes(id);
  }

  function getModuleFeatures(id: ModuleId): ModuleFeatureMap {
    return config.features[id] ?? {};
  }

  return (
    <OrgContext.Provider
      value={{
        currentOrganization: config.org,
        currentProject:      config.currentProject,
        currentUser:         config.currentUser,
        enabledModules:      config.enabledModules,
        features:            config.features,
        availableProjects:   MOCK_PROJECTS,
        setCurrentProject,
        isModuleEnabled,
        getModuleFeatures,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}
