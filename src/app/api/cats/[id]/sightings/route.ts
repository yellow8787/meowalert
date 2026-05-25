import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: reportId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "請求格式錯誤" }, { status: 400 });
  }

  const { lat, lng, location_address, message, spotted_at } =
    body as Record<string, string | number | undefined>;

  const userLat = typeof lat === "number" ? lat : parseFloat(lat as string);
  const userLng = typeof lng === "number" ? lng : parseFloat(lng as string);

  if (isNaN(userLat) || isNaN(userLng)) {
    return NextResponse.json({ error: "請提供目擊位置" }, { status: 400 });
  }

  // Distance check using the cat's blurred location from get_cat_detail
  const { data: catRows } = await supabase.rpc("get_cat_detail", { cat_id: reportId });
  const cat = catRows?.[0];
  if (!cat) return NextResponse.json({ error: "找不到此貓咪" }, { status: 404 });

  const distKm = haversineKm(userLat, userLng, cat.location_blurred_lat, cat.location_blurred_lng);
  if (distKm > 2) {
    return NextResponse.json(
      { error: `你的位置距離貓咪超過 2 公里（${distKm.toFixed(1)} km），請確認位置正確` },
      { status: 422 }
    );
  }

  const locationWkt = `SRID=4326;POINT(${userLng} ${userLat})`;

  const { data, error } = await supabase
    .from("cat_sightings")
    .insert({
      report_id: reportId,
      spotted_by: user.id,
      location: locationWkt,
      location_address: location_address ?? null,
      message: message ?? null,
      spotted_at: spotted_at ?? new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("[api/cats/[id]/sightings]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
