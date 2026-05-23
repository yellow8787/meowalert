import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const formData = await request.formData();

  const report_type = formData.get("report_type") as string | null;
  const status = formData.get("status") as string | null;
  const photo = formData.get("photo") as File | null;
  const location_lat = parseFloat(formData.get("location_lat") as string);
  const location_lng = parseFloat(formData.get("location_lng") as string);
  const location_address = (formData.get("location_address") as string | null) || null;
  const name = ((formData.get("name") as string | null) || "街貓").trim();
  const description = (formData.get("description") as string | null) || null;
  const tagsRaw = formData.get("tags") as string | null;

  if (!report_type || !status || !photo) {
    return NextResponse.json({ error: "缺少必要欄位 (type, status, photo)" }, { status: 400 });
  }
  if (!["stray", "lost", "found"].includes(report_type)) {
    return NextResponse.json({ error: "無效的回報類型" }, { status: 400 });
  }
  if (isNaN(location_lat) || isNaN(location_lng)) {
    return NextResponse.json({ error: "無效的位置座標，請設定位置" }, { status: 400 });
  }

  let tags: string[] = [];
  if (tagsRaw) {
    try {
      tags = JSON.parse(tagsRaw);
    } catch {
      tags = [];
    }
  }

  const location_wkt = `SRID=4326;POINT(${location_lng} ${location_lat})`;

  // 1. INSERT reports — 先拿到 ID，再用 ID 建 photo 路徑
  const { data: report, error: reportError } = await supabase
    .from("reports")
    .insert({
      report_type,
      status,
      name,
      description,
      tags,
      location: location_wkt,
      location_blurred: location_wkt, // set_blurred_location trigger 會自動覆寫
      location_address,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (reportError || !report) {
    return NextResponse.json(
      { error: reportError?.message ?? "建立回報失敗" },
      { status: 500 }
    );
  }

  const reportId = report.id;

  // 2. Upload photo (path: reports/{reportId}/...)
  const storagePath = `reports/${reportId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from("report-photos")
    .upload(storagePath, photo, { contentType: "image/jpeg", upsert: false });

  if (uploadError) {
    // 上傳失敗時清理剛建立的 report
    await supabase.from("reports").delete().eq("id", reportId);
    return NextResponse.json(
      { error: "照片上傳失敗: " + uploadError.message },
      { status: 500 }
    );
  }

  // 3. INSERT report_updates (update_type: 'created')
  const { data: update, error: updateError } = await supabase
    .from("report_updates")
    .insert({
      report_id: reportId,
      update_type: "created",
      message: description,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (updateError) {
    console.error("Failed to create initial report_update:", updateError.message);
  }

  // 4. INSERT report_photos
  const { error: photoError } = await supabase.from("report_photos").insert({
    report_id: reportId,
    update_id: update?.id ?? null,
    storage_path: storagePath,
    display_order: 0,
    uploaded_by: user.id,
  });

  if (photoError) {
    console.error("Failed to create report_photo record:", photoError.message);
  }

  return NextResponse.json({ id: reportId }, { status: 201 });
}
