export type PartnerType = "OWNED" | "PRODUCTION" | "AFFILIATE";
export type PartnerTier = "Premium" | "Standard" | "Basic";
export type PartnerStatus = "Active" | "Suspended" | "Terminated";

export interface Partner {
  id: string;
  name: string;
  company_name?: string | null;
  contact_name?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  type: PartnerType;
  tier: PartnerTier;
  rev_share: number;
  dept?: string | null;
  status: PartnerStatus;
  notes?: string | null;
  parent_id?: string | null;
  parent_name?: string | null;
  channel_count?: number;
  total_revenue?: number;
  children?: Partner[];
  created_at: string;
  updated_at: string;
}

export interface PartnerUser {
  id: string;
  partner_id: string | null;
  email: string;
  full_name: string;
  phone?: string | null;
  status: "PendingApproval" | "Active" | "Rejected" | "Suspended";
  approved_by?: string | null;
  approved_at?: string | null;
  last_login?: string | null;
  created_at: string;
}
