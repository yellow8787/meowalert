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

  const { data: report } = await supabase
    .from("reports")
    .select("id, status, created_by")
    .eq("id", reportId)
    .maybeSingle();

  if (!report) return NextResponse.json({ error: "找不到此回報" }, { status: 404 });
  if (report.status !== "found") {
    return NextResponse.json({ error: "此回報目前不在待認領狀態" }, { status: 400 });
  }

  const { error } = await supabase
    .from("reports")
    .update({
      claimed_by: user.id,
      claimed_at: new Date().toISOString(),
      status: "reunited",
    })
    .eq("id", reportId);

  if (error) {
    console.error("[api/cats/[id]/claim]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return reporter's contact info so client can show how to reach them
  const { data: reporterProfile } = await supabase
    .from("profiles")
    .select("display_name, line_id, messenger_url")
    .eq("id", report.created_by)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    reporter: reporterProfile ?? null,
    reportId,
  });
}
