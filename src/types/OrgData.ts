import { User } from "./User";

type OrgData = {
  sessionId: string;
  url: string;
  lastModified: string; // Use Date type if you prefer
  users: User[];
};

export type { OrgData };
