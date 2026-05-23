import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const EXPAND_RADIUSES = [1, 2.5, 5, 10, 25, 50];
const MIN_COUNT = 5;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = parseFloat(searchParams.get("lat") ?? "25.0339");
  const lng = parseFloat(searchParams.get("lng") ?? "121.5645");
  const statusParam = searchParams.get("status");

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "座標格式錯誤" }, { status: 400 });
  }

  const statusFilter =
    statusParam && statusParam.length > 0 ? statusParam.split(",") : null;

  const supabase = await createClient();

  for (const radius of EXPAND_RADIUSES) {
    const { data, error } = await supabase.rpc("get_cats_nearby", {
      user_lat: lat,
      user_lng: lng,
      radius_km: radius,
      status_filter: statusFilter,
    });

    if (error) {
      console.error("[api/cats/nearby]", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const count = data?.length ?? 0;
    if (count >= MIN_COUNT || radius === 50) {
      // Fetch one thumbnail per cat in a single query
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cats: any[] = data ?? [];
      let catsWithPhotos = cats.map((c) => ({ ...c, thumbnail_path: null }));

      if (cats.length > 0) {
        const catIds = cats.map((c) => c.id as string);
        const { data: photos } = await supabase
          .from("report_photos")
          .select("report_id, storage_path")
          .in("report_id", catIds)
          .order("display_order");

        if (photos && photos.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const photoMap = new Map<string, string>();
          photos.forEach((p: { report_id: string; storage_path: string }) => {
            if (!photoMap.has(p.report_id)) {
              photoMap.set(p.report_id, p.storage_path);
            }
          });
          catsWithPhotos = cats.map((c) => ({
            ...c,
            thumbnail_path: photoMap.get(c.id) ?? null,
          }));
        }
      }

      return NextResponse.json({
        cats: catsWithPhotos,
        radius,
        expanded: radius > 2.5,
        exhausted: radius === 50 && count < MIN_COUNT,
      });
    }
  }

  return NextResponse.json({ cats: [], radius: 50, expanded: true, exhausted: true });
}
