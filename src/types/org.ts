export type ModuleId = "cru" | "fix" | "inspect" | "datum";

export type UserRole = "owner" | "admin" | "pm" | "foreman" | "viewer";

export interface OrgContext {
  id:   string;
  name: string;
  slug: string;
}

export interface ProjectContext {
  id:   string;
  name: string;
  slug: string;
}

export interface UserContext {
  id:     string;
  name:   string;
  email:  string;
  role:   UserRole;
  avatar: string | null;
}

export type ModuleFeatureMap = Record<string, boolean>;

export interface OrgConfig {
  org:            OrgContext;
  currentProject: ProjectContext;
  currentUser:    UserContext;
  enabledModules: ModuleId[];
  features:       Partial<Record<ModuleId, ModuleFeatureMap>>;
}
