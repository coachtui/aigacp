"use client";

import React, { createContext, useContext, useState } from "react";
import type { OrgConfig, ProjectContext, ModuleId, UserRole } from "@/types/org";
import type { ModuleFeatureMap } from "@/types/org";
import { getOrgConfig, MOCK_PROJECTS } from "@/lib/config/org";

interface OrgContextValue {
  currentOrganization: OrgConfig["org"];
  currentProject:      ProjectContext;
  currentUser:         OrgConfig["currentUser"];
  role:                UserRole;
  enabledModules:      ModuleId[];
  features:            OrgConfig["features"];
  availableProjects:   ProjectContext[];
  setCurrentProject:   (project: ProjectContext) => void;
  setRole:             (role: UserRole) => void;
  isModuleEnabled:     (id: ModuleId) => boolean;
  getModuleFeatures:   (id: ModuleId) => ModuleFeatureMap;
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<OrgConfig>(getOrgConfig);

  function setCurrentProject(project: ProjectContext) {
    setConfig((prev) => ({ ...prev, currentProject: project }));
  }

  function setRole(role: UserRole) {
    setConfig((prev) => ({
      ...prev,
      currentUser: { ...prev.currentUser, role },
    }));
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
        role:                config.currentUser.role,
        enabledModules:      config.enabledModules,
        features:            config.features,
        availableProjects:   MOCK_PROJECTS,
        setCurrentProject,
        setRole,
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
