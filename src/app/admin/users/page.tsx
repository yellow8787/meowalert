import { requireAdmin } from "@/lib/auth/is-admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import { UserActions } from "./UserActions";
import type { UserRole } from "@/types/database";

const PAGE_SIZE = 20;

const ROLE_BADGE: Record<UserRole, string> = {
  user: "bg-gray-100 text-gray-600",
  admin: "bg-blue-100 text-blue-800",
  superadmin: "bg-purple-100 text-purple-800",
};

interface Props {
  searchParams: Promise<{ page?: string; q?: string }>;
}

export default async function UsersAdminPage({ searchParams }: Props) {
  const { user: adminUser } = await requireAdmin();
  const supabase = await createClient();

  const { page = "1", q = "" } = await searchParams;
  const currentPage = Math.max(1, parseInt(page, 10));
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("profiles")
    .select(
      "id, display_name, avatar_url, role, is_banned, banned_at, banned_reason, report_count, relay_count, rescue_count, created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (q.trim()) {
    query = query.ilike("display_name", `%${q.trim()}%`);
  }

  const { data: rows, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  function buildHref(overrides: Record<string, string>) {
    const params = new URLSearchParams({ page: "1", ...(q ? { q } : {}), ...overrides });
    return `/admin/users?${params}`;
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">👤 使用者管理</h1>

      {/* Search */}
      <form method="GET" action="/admin/users" className="flex gap-2 mb-5">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="搜尋顯示名稱…"
          className="h-9 px-3 rounded-lg border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring w-56"
        />
        <button
          type="submit"
          className="h-9 px-4 rounded-lg border text-sm hover:bg-muted transition-colors"
        >
          搜尋
        </button>
        {q && (
          <Link href="/admin/users" className="h-9 px-4 rounded-lg border text-sm hover:bg-muted transition-colors flex items-center">
            清除
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-medium">使用者</th>
              <th className="text-left px-4 py-3 font-medium">角色</th>
              <th className="text-left px-4 py-3 font-medium">統計</th>
              <th className="text-left px-4 py-3 font-medium">狀態</th>
              <th className="text-left px-4 py-3 font-medium">加入時間</th>
              <th className="text-left px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(rows ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-muted-foreground">目前無資料</td>
              </tr>
            )}
            {(rows ?? []).map((row) => (
              <tr key={row.id} className="hover:bg-muted/20">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {row.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-muted-foreground/20 flex items-center justify-center text-xs shrink-0">
                        {row.display_name?.charAt(0) ?? "?"}
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-medium">{row.display_name}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{row.id.slice(0, 8)}…</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE[row.role as UserRole] ?? ROLE_BADGE.user}`}>
                    {row.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  <div>回報 {row.report_count ?? 0}</div>
                  <div>接力 {row.relay_count ?? 0}</div>
                  <div>救援 {row.rescue_count ?? 0}</div>
                </td>
                <td className="px-4 py-3">
                  {row.is_banned ? (
                    <div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        已封禁
                      </span>
                      {row.banned_reason && (
                        <div className="text-[10px] text-muted-foreground mt-0.5 max-w-[120px] truncate" title={row.banned_reason}>
                          {row.banned_reason}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      正常
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(row.created_at), { addSuffix: true, locale: zhTW })}
                </td>
                <td className="px-4 py-3">
                  <UserActions
                    userId={row.id}
                    isBanned={row.is_banned ?? false}
                    isSelf={row.id === adminUser.id}
                  />
                </td>
              </tr>
            ))}
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
