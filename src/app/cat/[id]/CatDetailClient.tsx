"use client";

import { useState, useEffect } from "react";
import { BackHeader } from "@/components/layout/BackHeader";
import { CatStatusPill } from "@/components/cat/CatStatusPill";
import { CatTimeline, type TimelineUpdate } from "@/components/cat/CatTimeline";
import { CatActions } from "@/components/cat/CatActions";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { MapPin, Clock, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import type { ReportStatus } from "@/types/database";
import type { User } from "@supabase/supabase-js";

interface CatDetail {
  id: string;
  name: string;
  description: string | null;
  report_type: string;
  status: string;
  tags: string[] | null;
  location_blurred_lat: number;
  location_blurred_lng: number;
  location_address: string | null;
  location_district: string | null;
  location_city: string | null;
  photo_count: number;
  update_count: number;
  created_at: string;
  last_activity_at: string;
  created_by: string | null;
  created_by_name: string | null;
  created_by_avatar: string | null;
}

interface Photo {
  id: string;
  storage_path: string;
  exif_taken_at: string | null;
  display_order: number;
  update_id: string | null;
}

interface Props {
  cat: CatDetail;
  photos: Photo[];
  initialUpdates: TimelineUpdate[];
  supabaseUrl: string;
  catId: string;
  initialUser: User | null;
}

const TAG_LABELS: Record<string, string> = {
  injured: "受傷",
  trapped: "卡困",
  kitten: "幼貓",
  maybe_lost: "疑似走失",
};

export function CatDetailClient({ cat, photos, initialUpdates, supabaseUrl, catId, initialUser }: Props) {
  const { user: clientUser, loading } = useAuth();
  // Use server-provided user as fallback while client auth is hydrating
  const user = loading ? initialUser : (clientUser ?? initialUser);
  const [updates, setUpdates] = useState<TimelineUpdate[]>(initialUpdates);
  const [realtimeCount, setRealtimeCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();

    async function refreshUpdates() {
      const { data } = await supabase.rpc("get_cat_updates", { cat_id: catId });
      if (!data) return;
      const { data: updatePhotos } = await supabase
        .from("report_photos")
        .select("id, storage_path, display_order, update_id")
        .eq("report_id", catId)
        .not("update_id", "is", null);

      setUpdates(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.map((u: any) => ({
          ...u,
          photos: (updatePhotos ?? []).filter((p) => p.update_id === u.id),
        }))
      );
    }

    const channel = supabase
      .channel(`cat-updates-${catId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "report_updates",
          filter: `report_id=eq.${catId}`,
        },
        () => {
          setRealtimeCount((n) => n + 1);
          refreshUpdates();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [catId]);

  // Main photo = first photo without update_id (original report photo)
  const mainPhoto = photos.find((p) => p.update_id === null) ?? photos[0];
  const mainPhotoUrl = mainPhoto
    ? `${supabaseUrl}/storage/v1/object/public/report-photos/${mainPhoto.storage_path}`
    : null;

  const timeAgo = formatDistanceToNow(new Date(cat.last_activity_at), {
    addSuffix: true,
    locale: zhTW,
  });

  const locationText = [cat.location_district, cat.location_city]
    .filter(Boolean)
    .join(" · ");

  const extraTags = (cat.tags ?? []).filter((t) => t in TAG_LABELS);

  return (
    <div className="flex flex-col min-h-[calc(100dvh-4rem)] pb-4">
      <BackHeader
        title={cat.name}
        actions={
          realtimeCount > 0 ? (
            <span className="text-xs text-primary flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              即時更新中
            </span>
          ) : null
        }
      />

      {/* Main photo */}
      <div className="aspect-[4/3] bg-muted shrink-0">
        {mainPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mainPhotoUrl}
            alt={cat.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-5xl">🐱</span>
          </div>
        )}
      </div>

      {/* Basic info */}
      <div className="px-4 py-3 space-y-2 border-b">
        <div className="flex flex-wrap items-center gap-1.5">
          <CatStatusPill status={cat.status as ReportStatus} />
          {(cat.tags ?? []).includes("kitten") && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-[#E1F5EE] text-[#0F6E56] border-[#0F6E56]/30">
              幼貓
            </span>
          )}
          {extraTags
            .filter((t) => t !== "kitten")
            .map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-muted text-muted-foreground"
              >
                {TAG_LABELS[tag]}
              </span>
            ))}
        </div>

        <h1 className="text-xl font-bold">{cat.name}</h1>

        {cat.description && (
          <p className="text-sm text-muted-foreground">{cat.description}</p>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {locationText && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {locationText}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeAgo}
          </span>
        </div>

        {cat.created_by_name && (
          <div className="flex items-center gap-2 pt-1">
            {cat.created_by_avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cat.created_by_avatar}
                alt=""
                className="w-5 h-5 rounded-full object-cover"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-muted-foreground/20" />
            )}
            <span className="text-xs text-muted-foreground">
              由 {cat.created_by_name} 回報
            </span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-4 py-3 border-b">
        <CatActions
          catId={catId}
          status={cat.status as ReportStatus}
          isLoggedIn={!!user}
        />
      </div>

      {/* Timeline */}
      <div className="px-4 py-4">
        <h2 className="font-semibold text-sm mb-4">
          接力記錄
          {updates.length > 0 && (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              ({updates.length} 筆)
            </span>
          )}
        </h2>
        <CatTimeline updates={updates} supabaseUrl={supabaseUrl} />
      </div>
    </div>
  );
}
