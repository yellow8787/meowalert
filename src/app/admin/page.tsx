import { requireAdmin } from "@/lib/auth/is-admin";
import { createClient } from "@/lib/supabase/server";
import { AlertTriangle, Users, Cat, Ambulance, RefreshCw, Heart, Ban } from "lucide-react";

interface AdminStats {
  total_users: number;
  total_reports: number;
  reports_need_rescue: number;
  reports_pending: number;
  reports_rescued: number;
  reports_lost: number;
  reports_found: number;
  reports_reunited: number;
  pending_rescue_applications: number;
  total_updates: number;
  total_photos: number;
  banned_users: number;
}

interface StatCardProps {
  label: string;
  value: number | null | undefined;
  icon: React.ReactNode;
  highlight?: boolean;
  sub?: string;
}

function StatCard({ label, value, icon, highlight, sub }: StatCardProps) {
  return (
    <div
      className={`rounded-xl border p-4 flex items-start gap-3 ${
        highlight ? "border-red-300 bg-red-50" : "bg-card"
      }`}
    >
      <div
        className={`mt-0.5 shrink-0 ${highlight ? "text-red-600" : "text-muted-foreground"}`}
      >
        {icon}
      </div>
      <div>
        <div className={`text-2xl font-bold ${highlight ? "text-red-700" : ""}`}>
          {value ?? "—"}
        </div>
        <div className={`text-xs mt-0.5 ${highlight ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
          {label}
        </div>
        {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export default async function AdminDashboard() {
  await requireAdmin();
  const supabase = await createClient();

  // ── Debug: confirm user + role ────────────────────────────
  const { data: { user } } = await supabase.auth.getUser();
  console.log("[Admin] Current user:", user?.email, user?.id);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();
  console.log("[Admin] Profile role:", profile?.role);

  // ── Call RPC ──────────────────────────────────────────────
  const { data: stats, error: statsError } = await supabase.rpc("get_admin_stats");
  console.log("[Admin] Stats data:", JSON.stringify(stats));
  console.log("[Admin] Stats error:", statsError);
  // ─────────────────────────────────────────────────────────

  // RPC returns either a single row or a 1-element array depending on the function definition
  const s = Array.isArray(stats)
    ? ((stats as AdminStats[])[0] ?? null)
    : ((stats as AdminStats | null) ?? null);

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-xl font-bold mb-6">📊 儀表板</h1>

      {/* Urgent: pending rescue */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          需要處理
        </h2>
        <StatCard
          label="待審救援申請"
          value={s?.pending_rescue_applications}
          icon={<Ambulance className="h-5 w-5" />}
          highlight={(s?.pending_rescue_applications ?? 0) > 0}
          sub={
            (s?.pending_rescue_applications ?? 0) > 0
              ? "請盡速處理"
              : "目前無待審申請"
          }
        />
      </div>

      {/* Users & reports overview */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          全站概況
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="總用戶數" value={s?.total_users} icon={<Users className="h-5 w-5" />} />
          <StatCard label="總回報數" value={s?.total_reports} icon={<Cat className="h-5 w-5" />} />
          <StatCard label="接力更新總數" value={s?.total_updates} icon={<RefreshCw className="h-5 w-5" />} />
          <StatCard label="被封禁使用者" value={s?.banned_users} icon={<Ban className="h-5 w-5" />} />
        </div>
      </div>

      {/* Report breakdown */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          回報狀態分布
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="🔴 需救援" value={s?.reports_need_rescue} icon={<AlertTriangle className="h-5 w-5 text-red-500" />} />
          <StatCard label="🔵 救援中" value={s?.reports_pending} icon={<Ambulance className="h-5 w-5 text-blue-500" />} />
          <StatCard label="🟢 已救援" value={s?.reports_rescued} icon={<Heart className="h-5 w-5 text-green-500" />} />
          <StatCard label="🟣 走失家貓" value={s?.reports_lost} icon={<Cat className="h-5 w-5 text-purple-500" />} />
          <StatCard label="🟠 撿到街貓" value={s?.reports_found} icon={<Cat className="h-5 w-5 text-orange-500" />} />
          <StatCard label="🎉 已重逢" value={s?.reports_reunited} icon={<Heart className="h-5 w-5 text-pink-500" />} />
        </div>
      </div>
    </div>
  );
}
