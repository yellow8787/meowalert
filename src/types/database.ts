// ── Report types ────────────────────────────────────────────
export type ReportType = "stray" | "lost" | "found";
export type ReportStatus =
  | "need"
  | "pending"
  | "rescued"
  | "lost"
  | "found"
  | "reunited"
  | "archived";
export type ReportTag = "injured" | "trapped" | "kitten" | "maybe_lost";

/** get_cats_nearby RPC 回傳的型別（含模糊座標） */
export interface NearbyReport {
  id: string;
  name: string;
  status: ReportStatus;
  tags: ReportTag[];
  location_blurred_lat: number;
  location_blurred_lng: number;
  location_address: string | null;
  location_district: string | null;
  location_city: string | null;
  created_at: string;
  last_activity_at: string;
  update_count: number;
  distance_km: number;
  thumbnail_path: string | null;
}

// ── Rescue application types ─────────────────────────────────
export type RescueApplicationStatus = "pending" | "approved" | "rejected" | "completed" | "cancelled";

export interface RescueApplication {
  id: string;
  report_id: string;
  applied_by: string;           // not applicant_id
  hospital_name: string | null;
  hospital_place_id: string | null; // not hospital_id
  hospital_address: string | null;
  hospital_phone: string | null;
  expected_action_time: string | null;
  contact_phone: string | null;
  contact_line: string | null;
  contact_other: string | null;
  message: string | null;       // not notes
  status: RescueApplicationStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;           // not applied_at
  updated_at: string;
}

// ── Profile types ────────────────────────────────────────────
export type UserRole = "user" | "admin" | "superadmin";

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;

  // 聯絡方式
  line_id: string | null;
  messenger_url: string | null;

  // 個人統計
  report_count: number;
  rescue_count: number;
  relay_count: number;

  // 通知設定
  notification_enabled: boolean;
  notify_my_reports: boolean;
  notify_nearby_urgent: boolean;
  notify_nearby_radius_km: number;
  notify_rescue_result: boolean;
  notify_lost_cat_result: boolean;
  notify_found_cat_match: boolean;
  notify_my_lost_cat_spotted: boolean;

  // 角色與狀態
  role: UserRole;
  is_banned: boolean;
  banned_at: string | null;
  banned_reason: string | null;

  // 預設位置 (Supabase geography 回傳格式)
  home_location: unknown | null;

  created_at: string;
  updated_at: string;
}
