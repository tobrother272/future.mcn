export type ChannelStatus = "Active" | "Pending" | "Suspended" | "Terminated";
export type MonetizationStatus = "On" | "Off";
export type HealthStatus = "Healthy" | "Warning" | "Critical";

export interface Channel {
  id: string;
  cms_id: string | null;
  partner_id: string | null;
  topic_id: string | null;
  yt_id: string | null;
  name: string;
  country: string;
  status: ChannelStatus;
  monetization: MonetizationStatus;
  health: HealthStatus;
  strikes: number;
  subscribers: number;
  monthly_views: number;
  total_views: number;
  video: number;
  monthly_revenue: number;
  last_revenue: number;
  last_sync?: string | null;
  last_sync_analytic?: string | null;
  link_date?: string | null;
  notes?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined fields (optional)
  cms_name?: string;
  partner_name?: string;
  topic_name?: string;
}

export interface ChannelCreate {
  cms_id?: string;
  partner_id?: string;
  topic_id?: string;
  yt_id?: string;
  name: string;
  country?: string;
  status?: ChannelStatus;
  monetization?: MonetizationStatus;
  notes?: string;
}

export interface ChannelFilters {
  cms_id?: string;
  partner_id?: string;
  status?: ChannelStatus;
  monetization?: MonetizationStatus;
  search?: string;
}
