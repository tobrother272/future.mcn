export type CmsCurrency = "USD" | "VND" | "CAD" | "EUR" | "GBP" | "JPY" | "SGD" | "AUD";
export type CmsStatus = "Active" | "Suspended" | "Closed";

export interface Cms {
  id: string;
  name: string;
  currency: CmsCurrency;
  status: CmsStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CmsCreate {
  id: string;
  name: string;
  currency: CmsCurrency;
  notes?: string;
}

export interface CmsUpdate {
  name?: string;
  currency?: CmsCurrency;
  status?: CmsStatus;
  notes?: string;
}

export interface CmsStats {
  cms_id: string;
  cms_name: string;
  currency: CmsCurrency;
  total_channels: number;
  active_channels: number;
  monetized: number;
  demonetized: number;
  total_monthly_revenue: number;
  total_subscribers: number;
  total_monthly_views: number;
  partner_count: number;
}

export interface CmsApiKey {
  id: string;
  cms_id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  status: "Active" | "Revoked";
  created_by: string | null;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export interface CmsApiKeyCreated extends CmsApiKey {
  token: string;
  warning: string;
}

export interface Topic {
  id: string;
  cms_id?: string | null;
  name: string;
  dept: string | null;
  expected_channels: number;
  channel_count?: number;
  created_at: string;
}
