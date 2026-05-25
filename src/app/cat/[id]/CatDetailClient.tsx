"use client";

import { useState, useEffect } from "react";
import { BackHeader } from "@/components/layout/BackHeader";
import { CatStatusPill } from "@/components/cat/CatStatusPill";
import { CatTimeline, type TimelineUpdate } from "@/components/cat/CatTimeline";
import { CatActions } from "@/components/cat/CatActions";
import { SightingButton } from "@/components/cat/SightingButton";
import { ReunitedButton } from "@/components/cat/ReunitedButton";
import { ClaimButton } from "@/components/cat/ClaimButton";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { MapPin, Clock, RefreshCw, Phone, MessageCircle, AlertTriangle, HandHelping } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
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
  reporter_line_id?: string | null;
  reporter_messenger_url?: string | null;
  // M6: lost cat
  owner_contact_phone?: string | null;
  owner_contact_line?: string | null;
  owner_contact_other?: string | null;
  lost_at?: string | null;
  last_seen_address?: string | null;
  // M6: found cat
  temporary_care?: boolean | null;
  temporary_care_until?: string | null;
  // M6: reunited
  reunited_at?: string | null;
  claimed_by?: string | null;
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
  const user = loading ? initialUser : (clientUser ?? initialUser);
  const [updates, setUpdates] = useState<TimelineUpdate[]>(initialUpdates);
  const [realtimeCount, setRealtimeCount] = useState(0);

  const isOwner = !!user && user.id === cat.created_by;
  const isLost = cat.status === "lost";
  const isFound = cat.status === "found";
  const isStray = cat.report_type === "stray";

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
        { event: "INSERT", schema: "public", table: "report_updates", filter: `report_id=eq.${catId}` },
        () => {
          setRealtimeCount((n) => n + 1);
          refreshUpdates();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [catId]);

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
          <img src={mainPhotoUrl} alt={cat.name} className="w-full h-full object-cover" />
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
          {extraTags.filter((t) => t !== "kitten").map((tag) => (
            <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-muted text-muted-foreground">
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
              <img src={cat.created_by_avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-muted-foreground/20" />
            )}
            <span className="text-xs text-muted-foreground">
              由 {cat.created_by_name} 回報
            </span>
          </div>
        )}
      </div>

      {/* ── 走失家貓資訊區塊 ── */}
      {isLost && (
        <div className="mx-4 mt-3 rounded-xl border border-purple-200 bg-purple-50/50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-purple-600 shrink-0" />
            <span className="text-sm font-semibold text-purple-700">走失家貓</span>
            {cat.lost_at && (
              <span className="text-xs text-purple-500 ml-auto">
                {formatDistanceToNow(new Date(cat.lost_at), { addSuffix: true, locale: zhTW })} 走失
              </span>
            )}
          </div>
          {cat.last_seen_address && (
            <p className="text-xs text-purple-700">
              <span className="font-medium">最後出沒：</span>{cat.last_seen_address}
            </p>
          )}
          {cat.owner_contact_phone && (
            <a
              href={`tel:${cat.owner_contact_phone}`}
              className="flex items-center gap-2 text-sm font-medium text-purple-700 hover:underline"
            >
              <Phone className="h-4 w-4" />
              {cat.owner_contact_phone}
            </a>
          )}
          {cat.owner_contact_line && (
            <a
              href={`https://line.me/R/ti/p/~${cat.owner_contact_line}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-medium text-[#06C755] hover:underline"
            >
              <MessageCircle className="h-4 w-4" />
              LINE: {cat.owner_contact_line}
            </a>
          )}
          {cat.owner_contact_other && (
            <p className="text-xs text-purple-700">
              <span className="font-medium">其他聯絡：</span>{cat.owner_contact_other}
            </p>
          )}
        </div>
      )}

      {/* ── 撿到街貓資訊區塊 ── */}
      {isFound && (
        <div className="mx-4 mt-3 rounded-xl border border-green-200 bg-green-50/50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <HandHelping className="h-4 w-4 text-green-600 shrink-0" />
            <span className="text-sm font-semibold text-green-700">撿到街貓 — 等待飼主認領</span>
          </div>
          {cat.temporary_care ? (
            <p className="text-xs text-green-700">
              回報者目前暫時照護中
              {cat.temporary_care_until && (
                <span> · 暫養至 {format(new Date(cat.temporary_care_until), "M 月 d 日", { locale: zhTW })}</span>
              )}
            </p>
          ) : (
            <p className="text-xs text-green-700">貓咪目前在外，請儘速認領</p>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="px-4 py-3 border-b">
        {isStray ? (
          <CatActions
            catId={catId}
            status={cat.status as ReportStatus}
            isLoggedIn={!!user}
            reporterLineId={cat.reporter_line_id}
            reporterMessengerUrl={cat.reporter_messenger_url}
          />
        ) : isLost && cat.status === "lost" ? (
          <div className="grid grid-cols-2 gap-2">
            {user && <SightingButton catId={catId} />}
            {isOwner && <ReunitedButton catId={catId} />}
            {!user && (
              <p className="col-span-2 text-xs text-center text-muted-foreground py-2">
                登入後才能回報目擊或標記找到
              </p>
            )}
          </div>
        ) : isFound && cat.status === "found" ? (
          <div className="grid grid-cols-2 gap-2">
            {user && !isOwner && <ClaimButton catId={catId} />}
            {isOwner && (
              <p className="col-span-2 text-xs text-center text-muted-foreground py-2">
                等待飼主認領中
              </p>
            )}
            {!user && (
              <p className="col-span-2 text-xs text-center text-muted-foreground py-2">
                登入後才能認領
              </p>
            )}
          </div>
        ) : null}
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
