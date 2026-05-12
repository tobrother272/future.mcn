export type RevenueScope = "cms" | "channel" | "partner" | "contract";
export type RevenueSource = "auto" | "manual" | "import" | "adsense" | "youtube_api" | "csv_import";

export interface RevenueDaily {
  id: number;
  scope: RevenueScope;
  scope_id: string;
  snapshot_date: string;
  currency: string;
  revenue: number;
  views: number;
  subscribers: number;
  channels_count: number;
  active_channels: number;
  source: RevenueSource;
  notes?: string | null;
  created_at: string;
}

export interface RevenueVariation {
  current: number;
  previous: number;
  delta: number;
  delta_pct: number;
  current_date: string;
  previous_date: string;
}
