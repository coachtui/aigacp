import type { User } from "@/types/domain";

export const MOCK_USERS: User[] = [
  {
    id:    "user_owner_001",
    name:  "Marcus Webb",
    email: "marcus@aigaconstruction.com",
    role:  "owner",
  },
  {
    id:    "user_admin_002",
    name:  "Sarah Kim",
    email: "sarah.kim@aigaconstruction.com",
    role:  "pm",
  },
  {
    id:    "user_pm_003",
    name:  "Derek Rowan",
    email: "derek.rowan@aigaconstruction.com",
    role:  "pm",
  },
  {
    id:    "user_foreman_004",
    name:  "Tony Reeves",
    email: "tony.reeves@aigaconstruction.com",
    role:  "foreman",
  },
  {
    id:    "user_foreman_005",
    name:  "Angela Torres",
    email: "angela.torres@aigaconstruction.com",
    role:  "foreman",
  },
  {
    id:    "user_viewer_006",
    name:  "James Okafor",
    email: "james.okafor@aigaconstruction.com",
    role:  "pm",
  },
  {
    id:    "user_viewer_007",
    name:  "Lisa Park",
    email: "lisa.park@aigaconstruction.com",
    role:  "admin",
  },
];
