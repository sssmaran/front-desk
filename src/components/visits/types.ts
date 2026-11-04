// Shapes of the API responses the visits page reads.
export interface VisitRow {
  visit_id: string;
  visit_date: string;
  signed_in_at: string;
  signed_out_at: string | null;
  visit_type: string;
  host_team: string;
  pre_registered: boolean;
  // admin only — absent from viewer responses
  visitor_name?: string;
  visitor_company?: string;
  host_name?: string;
}

export interface VisitsResponse {
  dataGaps: { from: string; to: string; label: string }[];
  visits: VisitRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  notices: string[];
}

export interface StatsResponse {
  total: number;
  busiestDay: string | null;
  busiestHour: number | null;
  byDay: { day: string; count: number }[];
  byHour: { hour: number; count: number }[];
  byType: Record<string, number>;
  byTeam: Record<string, number>;
  notices: string[];
}

export const FILTER_KEYS = ["from", "to", "type"] as const;
