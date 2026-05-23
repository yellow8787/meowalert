import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: reportId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const {
    hospital_name,
    hospital_place_id,
    hospital_address,
    hospital_phone,
    contact_phone,
    contact_line,
    contact_other,
    message,
  } = body as Record<string, string | undefined>;

  if (!hospital_name?.trim()) {
    return NextResponse.json({ error: "請填寫救援目的地名稱" }, { status: 400 });
  }

  // 24h dedup — uses created_at (not applied_at)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: existing } = await supabase
    .from("rescue_applications")
    .select("id")
    .eq("report_id", reportId)
    .eq("applied_by", user.id)
    .gte("created_at", since)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "你在 24 小時內已送出過這隻貓的救援申請" },
      { status: 429 }
    );
  }

  const { data, error } = await supabase
    .from("rescue_applications")
    .insert({
      report_id: reportId,
      applied_by: user.id,
      hospital_name: hospital_name.trim(),
      hospital_place_id: hospital_place_id ?? null,
      hospital_address: hospital_address ?? null,
      hospital_phone: hospital_phone ?? null,
      contact_phone: contact_phone ?? null,
      contact_line: contact_line ?? null,
      contact_other: contact_other ?? null,
      message: message ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[api/cats/[id]/rescue]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Add a rescue_applied entry to the timeline
  await supabase.from("report_updates").insert({
    report_id: reportId,
    update_type: "rescue_applied",
    message: `送出救援申請（${hospital_name.trim()}）`,
    created_by: user.id,
  });

  return NextResponse.json({ id: data.id }, { status: 201 });
}
