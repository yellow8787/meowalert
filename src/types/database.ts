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
