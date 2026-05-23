import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { canRelay } from "@/lib/geo/distance-limit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_cat_updates", { cat_id: id });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: photos } = await supabase
    .from("report_photos")
    .select("id, storage_path, display_order, update_id")
    .eq("report_id", id)
    .not("update_id", "is", null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates = (data ?? []).map((u: any) => ({
    ...u,
    photos: (photos ?? []).filter((p) => p.update_id === u.id),
  }));

  return NextResponse.json({ updates });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const formData = await request.formData();
  const type = formData.get("type") as string | null;
  const photo = formData.get("photo") as File | null;
  const message = (formData.get("message") as string | null) || null;
  const userGpsLat = parseFloat(formData.get("user_gps_lat") as string);
  const userGpsLng = parseFloat(formData.get("user_gps_lng") as string);
  const newLocLat = formData.get("new_location_lat")
    ? parseFloat(formData.get("new_location_lat") as string)
    : null;
  const newLocLng = formData.get("new_location_lng")
    ? parseFloat(formData.get("new_location_lng") as string)
    : null;
  const newLocAddress = (formData.get("new_location_address") as string | null) || null;

  if (!type || !photo) {
    return NextResponse.json({ error: "缺少必要欄位 (type, photo)" }, { status: 400 });
  }

  if (!["moved", "spotted"].includes(type)) {
    return NextResponse.json({ error: "無效的更新類型" }, { status: 400 });
  }

  if (type === "moved" && (newLocLat === null || newLocLng === null)) {
    return NextResponse.json({ error: "換位置時必須提供新座標" }, { status: 400 });
  }

  // 取得貓咪目前位置做距離檢查
  const { data: catRows } = await supabase.rpc("get_cat_detail", { cat_id: id });
  if (!catRows?.length) {
    return NextResponse.json({ error: "找不到此貓咪" }, { status: 404 });
  }
  const cat = catRows[0];

  if (!isNaN(userGpsLat) && !isNaN(userGpsLng)) {
    const result = canRelay(
      { lat: userGpsLat, lng: userGpsLng },
      { lat: cat.location_blurred_lat, lng: cat.location_blurred_lng }
    );
    if (!result.allowed) {
      return NextResponse.json(
        {
          error: "distance_exceeded",
          user_distance_km: result.distanceKm,
          max_allowed_km: 2,
          message: result.reason,
        },
        { status: 400 }
      );
    }
  }

  // 上傳照片 (路徑第一層必須是 reports 才符合 Storage RLS policy)
  const storagePath = `reports/${id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("report-photos")
    .upload(storagePath, photo, { contentType: "image/jpeg", upsert: false });

  if (uploadError) {
    return NextResponse.json(
      { error: "照片上傳失敗: " + uploadError.message },
      { status: 500 }
    );
  }

  // 建立 report_update
  const { data: update, error: updateError } = await supabase
    .from("report_updates")
    .insert({
      report_id: id,
      update_type: type,
      message,
      new_location:
        type === "moved" && newLocLat !== null && newLocLng !== null
          ? `SRID=4326;POINT(${newLocLng} ${newLocLat})`
          : null,
      user_gps_at_action:
        !isNaN(userGpsLat) && !isNaN(userGpsLng)
          ? `SRID=4326;POINT(${userGpsLng} ${userGpsLat})`
          : null,
      created_by: user.id,
    })
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // 建立 report_photo 記錄 (uploaded_by 符合 schema 欄位名與 RLS policy)
  await supabase.from("report_photos").insert({
    report_id: id,
    update_id: update.id,
    storage_path: storagePath,
    display_order: 0,
    uploaded_by: user.id,
  });

  // 若換位置，同步更新地址文字
  if (type === "moved" && newLocAddress) {
    await supabase
      .from("reports")
      .update({ location_address: newLocAddress })
      .eq("id", id);
  }

  return NextResponse.json({ update_id: update.id }, { status: 201 });
}
