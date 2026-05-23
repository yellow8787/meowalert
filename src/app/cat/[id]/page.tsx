import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { CatDetailClient } from "./CatDetailClient";
import type { TimelineUpdate } from "@/components/cat/CatTimeline";
import type { User } from "@supabase/supabase-js";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CatDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: catRows, error } = await supabase.rpc("get_cat_detail", {
    cat_id: id,
  });

  if (error || !catRows?.length) {
    notFound();
  }

  const cat = catRows[0];

  const [{ data: photos }, { data: updatesData }, { data: updatePhotos }] =
    await Promise.all([
      supabase
        .from("report_photos")
        .select("id, storage_path, exif_taken_at, display_order, update_id")
        .eq("report_id", id)
        .order("display_order"),
      supabase.rpc("get_cat_updates", { cat_id: id }),
      supabase
        .from("report_photos")
        .select("id, storage_path, display_order, update_id")
        .eq("report_id", id)
        .not("update_id", "is", null),
    ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: TimelineUpdate[] = (updatesData ?? []).map((u: any) => ({
    ...u,
    photos: (updatePhotos ?? []).filter((p) => p.update_id === u.id),
  }));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  return (
    <CatDetailClient
      cat={cat}
      photos={photos ?? []}
      initialUpdates={updates}
      supabaseUrl={supabaseUrl}
      catId={id}
      initialUser={user}
    />
  );
}
