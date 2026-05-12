export type InternalRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "QC_REVIEWER"
  | "CHANNEL_CREATOR"
  | "CONTENT_MANAGER"
  | "FINANCE_MANAGER"
  | "COMPLIANCE_MANAGER"
  | "VIEWER";

export interface InternalUser {
  id: string;
  email: string;
  full_name: string;
  role: InternalRole;
  extra_roles?: string[];
  status: "Active" | "Suspended";
  mfa_enabled: boolean;
  last_login?: string | null;
  created_at: string;
}

export type CurrentUser =
  | ({ userType: "internal" } & InternalUser)
  | ({ userType: "partner"; partner_id: string | null } & import("./partner").PartnerUser);
