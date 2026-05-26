import { requireAdmin } from "@/lib/auth/is-admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import { ReportActions } from "./ReportActions";

const PAGE_SIZE = 20;

const STATUS_LABEL: Record<string, string> = {
  need: "需救援",
  pending: "救援中",
  rescued: "已救援",
  lost: "走失",
  found: "撿到",
  reunited: "已重逢",
};

const STATUS_BADGE: Record<string, string> = {
  need: "bg-red-100 text-red-800",
  pending: "bg-blue-100 text-blue-800",
  rescued: "bg-green-100 text-green-800",
  lost: "bg-purple-100 text-purple-800",
  found: "bg-orange-100 text-orange-800",
  reunited: "bg-pink-100 text-pink-800",
};

const TYPE_LABEL: Record<string, string> = {
  stray: "街貓",
  lost: "走失",
  found: "撿到",
};

interface Props {
  searchParams: Promise<{ status?: string; page?: string; q?: string }>;
}

export default async function ReportsAdminPage({ searchParams }: Props) {
  await requireAdmin();
  const supabase = await createClient();

  const { status = "all", page = "1", q = "" } = await searchParams;
  const currentPage = Math.max(1, parseInt(page, 10));
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // ── Debug logs ────────────────────────────────────────────
  const { data: { user: dbgUser } } = await supabase.auth.getUser();
  console.log("[AdminReports] user:", dbgUser?.email);
  const { count: bareCount, error: bareError } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true });
  console.log("[AdminReports] bare count:", bareCount, "error:", bareError?.message);
  // ─────────────────────────────────────────────────────────

  let query = supabase
    .from("reports")
    .select(
      `id, name, report_type, status, location_address, location_district,
       location_city, created_at, last_activity_at, update_count, photo_count,
       creator:profiles!created_by(display_name, avatar_url)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status === "archived") {
    query = query.eq("status", "archived");
  } else if (status !== "all") {
    query = query.eq("status", status);
  }
  if (q.trim()) {
    query = query.ilike("name", `%${q.trim()}%`);
  }

  const { data: rows, count, error: rowsError } = await query;
  console.log("[AdminReports] full query count:", count, "error:", rowsError?.message);
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  const STATUS_FILTER_OPTIONS = [
    { value: "all", label: "全部" },
    { value: "need", label: "需救援" },
    { value: "pending", label: "救援中" },
    { value: "rescued", label: "已救援" },
    { value: "lost", label: "走失" },
    { value: "found", label: "撿到" },
    { value: "reunited", label: "已重逢" },
    { value: "archived", label: "已封存" },
  ];

  function buildHref(overrides: Record<string, string>) {
    const params = new URLSearchParams({ status, page: "1", ...(q ? { q } : {}), ...overrides });
    return `/admin/reports?${params}`;
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">🐱 回報管理</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        {/* Status filter */}
        <div className="flex gap-1 border rounded-lg p-1">
          {STATUS_FILTER_OPTIONS.map(({ value, label }) => (
            <Link
              key={value}
              href={buildHref({ status: value })}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                status === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Search */}
        <form method="GET" action="/admin/reports" className="flex gap-1">
          <input type="hidden" name="status" value={status} />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="搜尋貓咪名稱…"
            className="h-8 px-3 rounded-lg border text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring w-44"
          />
          <button
            type="submit"
            className="h-8 px-3 rounded-lg border text-xs hover:bg-muted transition-colors"
          >
            搜尋
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-medium">貓咪</th>
              <th className="text-left px-4 py-3 font-medium">類型</th>
              <th className="text-left px-4 py-3 font-medium">地區</th>
              <th className="text-left px-4 py-3 font-medium">回報者</th>
              <th className="text-left px-4 py-3 font-medium">建立時間</th>
              <th className="text-left px-4 py-3 font-medium">狀態</th>
              <th className="text-left px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(rows ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-muted-foreground">目前無資料</td>
              </tr>
            )}
            {(rows ?? []).map((row) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const creator = row.creator as any;
              return (
                <tr key={row.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <Link
                      href={`/cat/${row.id}`}
                      target="_blank"
                      className="text-primary hover:underline font-medium text-xs"
                    >
                      {row.name}
                    </Link>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {row.update_count} 筆更新 · {row.photo_count} 張照片
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {TYPE_LABEL[row.report_type] ?? row.report_type}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {[row.location_district, row.location_city].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {creator?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={creator.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-muted-foreground/20" />
                      )}
                      <span className="text-xs">{creator?.display_name ?? "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(row.created_at), { addSuffix: true, locale: zhTW })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[row.status] ?? "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABEL[row.status] ?? row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <ReportActions reportId={row.id} currentStatus={row.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-muted-foreground">
            共 {count} 筆，第 {currentPage} / {totalPages} 頁
          </span>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <Link href={buildHref({ page: String(currentPage - 1) })} className="px-3 py-1 border rounded-lg hover:bg-muted text-xs">
                上一頁
              </Link>
            )}
            {currentPage < totalPages && (
              <Link href={buildHref({ page: String(currentPage + 1) })} className="px-3 py-1 border rounded-lg hover:bg-muted text-xs">
                下一頁
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
