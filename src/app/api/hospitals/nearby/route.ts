import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { searchNearbyHospitals } from "@/lib/google-places";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") ?? "25.0339");
  const lng = parseFloat(searchParams.get("lng") ?? "121.5645");

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "座標格式錯誤" }, { status: 400 });
  }

  // Round to 2 decimal places (~1.1km grid) for cache key
  const roundedLat = Math.round(lat * 100) / 100;
  const roundedLng = Math.round(lng * 100) / 100;

  console.log("[api/hospitals/nearby] lat:", roundedLat, "lng:", roundedLng);

  try {
    // During debug: call directly to bypass cache and see console.log output
    const hospitals = await searchNearbyHospitals(roundedLat, roundedLng);
    return NextResponse.json({ hospitals });
  } catch (e) {
    console.error("[api/hospitals/nearby]", e);
    return NextResponse.json(
      { error: "無法取得附近醫院資料" },
      { status: 500 }
    );
  }
}
