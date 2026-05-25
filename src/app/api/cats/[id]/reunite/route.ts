import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: reportId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  // Verify the caller is the reporter
  const { data: report } = await supabase
    .from("reports")
    .select("id, status, created_by")
    .eq("id", reportId)
    .maybeSingle();

  if (!report) return NextResponse.json({ error: "找不到此回報" }, { status: 404 });
  if (report.created_by !== user.id) {
    return NextResponse.json({ error: "只有飼主本人才能標記找到" }, { status: 403 });
  }
  if (report.status !== "lost") {
    return NextResponse.json({ error: "只有走失中的貓才能標記找到" }, { status: 400 });
  }

  const { error } = await supabase
    .from("reports")
    .update({ status: "reunited" })
    .eq("id", reportId);

  if (error) {
    console.error("[api/cats/[id]/reunite]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
