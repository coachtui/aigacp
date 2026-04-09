import type { Crew } from "@/types/domain";

export const MOCK_CREWS: Crew[] = [
  {
    id:         "crew_001",
    name:       "Structural Crew T-3",
    lead_name:  "Marcus Jimenez",
    headcount:  14,
    project_id: "proj_highland_002",
    status:     "on_site",
  },
  {
    id:         "crew_002",
    name:       "Mechanical Crew M-1",
    lead_name:  "Tony Reeves",
    headcount:  6,
    project_id: "proj_highland_002",
    status:     "on_site",
  },
  {
    id:         "crew_003",
    name:       "Electrical Crew E-2",
    lead_name:  "Dana Patel",
    headcount:  8,
    project_id: "proj_highland_002",
    status:     "off_site",
  },
  {
    id:         "crew_004",
    name:       "Foundation Crew F-1",
    lead_name:  "Roberto Silva",
    headcount:  18,
    project_id: "proj_oakridge_001",
    status:     "on_site",
  },
  {
    id:         "crew_005",
    name:       "Site Prep Crew SP-1",
    lead_name:  "Carmen Nguyen",
    headcount:  10,
    project_id: "proj_oakridge_001",
    status:     "on_site",
  },
];
