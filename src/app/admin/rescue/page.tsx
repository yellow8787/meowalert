import { requireAdmin } from "@/lib/auth/is-admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatDistanceToNow, format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { RescueActions } from "./RescueActions";
import type { RescueApplicationStatus } from "@/types/database";

const PAGE_SIZE = 20;

const STATUS_TABS: Array<{ value: string; label: string }> = [
  { value: "pending", label: "待審" },
  { value: "approved", label: "已通過" },
  { value: "rejected", label: "已退回" },
  { value: "completed", label: "已完成" },
  { value: "all", label: "全部" },
];

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-gray-100 text-gray-600",
};

interface Props {
  searchParams: Promise<{ status?: string; page?: string }>;
}

export default async function RescueAdminPage({ searchParams }: Props) {
  await requireAdmin();
  const supabase = await createClient();

  const { status = "pending", page = "1" } = await searchParams;
  const currentPage = Math.max(1, parseInt(page, 10));
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("rescue_applications")
    .select(
      `id, status, hospital_name, hospital_address, hospital_phone,
       expected_action_time, contact_phone, contact_line, message,
       review_note, reviewed_at, created_at,
       applicant:profiles!applied_by(display_name, avatar_url),
       report:reports!report_id(id, name, status)`,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status !== "all") {
    query = query.eq("status", status as RescueApplicationStatus);
  }

  const { data: rows, count } = await query;
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">🚑 救援申請審核</h1>

      {/* Status tabs */}
      <div className="flex gap-1 mb-5 border-b">
        {STATUS_TABS.map(({ value, label }) => (
          <Link
            key={value}
            href={`/admin/rescue?status=${value}&page=1`}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              status === value
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3 font-medium">申請者</th>
              <th className="text-left px-4 py-3 font-medium">對象貓咪</th>
              <th className="text-left px-4 py-3 font-medium">醫院</th>
              <th className="text-left px-4 py-3 font-medium">聯絡方式</th>
              <th className="text-left px-4 py-3 font-medium">申請時間</th>
              <th className="text-left px-4 py-3 font-medium">狀態</th>
              {status === "pending" && (
                <th className="text-left px-4 py-3 font-medium">操作</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y">
            {(rows ?? []).length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-muted-foreground">
                  目前無資料
                </td>
              </tr>
            )}
            {(rows ?? []).map((row) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const applicant = row.applicant as any;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const report = row.report as any;
              return (
                <tr key={row.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {applicant?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={applicant.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-muted-foreground/20" />
                      )}
                      <span className="text-xs">{applicant?.display_name ?? "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {report ? (
                      <Link
                        href={`/cat/${report.id}`}
                        target="_blank"
                        className="text-primary hover:underline text-xs"
                      >
                        {report.name}
                      </Link>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs">
                      <div className="font-medium">{row.hospital_name ?? "—"}</div>
                      {row.hospital_phone && (
                        <div className="text-muted-foreground">{row.hospital_phone}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {row.contact_phone && <div>{row.contact_phone}</div>}
                    {row.contact_line && <div>LINE: {row.contact_line}</div>}
                    {!row.contact_phone && !row.contact_line && "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(row.created_at), { addSuffix: true, locale: zhTW })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[row.status] ?? STATUS_BADGE.cancelled}`}>
                      {row.status}
                    </span>
                    {row.review_note && (
                      <div className="text-[10px] text-muted-foreground mt-0.5 max-w-[120px] truncate" title={row.review_note}>
                        {row.review_note}
                      </div>
                    )}
                    {row.reviewed_at && (
                      <div className="text-[10px] text-muted-foreground">
                        {format(new Date(row.reviewed_at), "M/d HH:mm")}
                      </div>
                    )}
                  </td>
                  {status === "pending" && (
                    <td className="px-4 py-3">
                      <RescueActions rescueId={row.id} />
                    </td>
                  )}
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
              <Link
                href={`/admin/rescue?status=${status}&page=${currentPage - 1}`}
                className="px-3 py-1 border rounded-lg hover:bg-muted text-xs"
              >
                上一頁
              </Link>
            )}
            {currentPage < totalPages && (
              <Link
                href={`/admin/rescue?status=${status}&page=${currentPage + 1}`}
                className="px-3 py-1 border rounded-lg hover:bg-muted text-xs"
              >
                下一頁
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
