import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: catRows, error } = await supabase.rpc("get_cat_detail", {
    cat_id: id,
  });

  if (error || !catRows?.length) {
    return NextResponse.json({ error: "找不到此貓咪" }, { status: 404 });
  }

  const { data: photos } = await supabase
    .from("report_photos")
    .select("id, storage_path, exif_taken_at, display_order, update_id")
    .eq("report_id", id)
    .order("display_order");

  return NextResponse.json({ cat: catRows[0], photos: photos ?? [] });
}
