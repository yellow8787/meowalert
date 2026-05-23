"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { MapPin, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import { CatStatusPill } from "./CatStatusPill";
import type { NearbyReport, ReportStatus, ReportTag } from "@/types/database";

const TAG_LABELS: Record<ReportTag, string> = {
  injured: "受傷",
  trapped: "卡困",
  kitten: "幼貓",
  maybe_lost: "疑似走失",
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

interface Props {
  cat: NearbyReport;
  isSelected: boolean;
}

export function CatCard({ cat, isSelected }: Props) {
  const timeAgo = formatDistanceToNow(new Date(cat.last_activity_at), {
    addSuffix: true,
    locale: zhTW,
  });

  const locationText = [cat.location_district, cat.location_city]
    .filter(Boolean)
    .join(" · ");

  const distanceText =
    cat.distance_km < 1
      ? `${Math.round(cat.distance_km * 1000)} 公尺`
      : `${cat.distance_km.toFixed(1)} 公里`;

  const extraTags = (cat.tags ?? []).filter(
    (t): t is ReportTag => t !== "kitten" && t in TAG_LABELS
  );

  const thumbnailUrl = cat.thumbnail_path
    ? `${SUPABASE_URL}/storage/v1/object/public/report-photos/${cat.thumbnail_path}`
    : null;

  return (
    <Link
      href={`/cat/${cat.id}`}
      className={cn(
        "w-full text-left rounded-xl border p-3 transition-all block",
        "hover:border-primary/40 hover:shadow-sm active:scale-[0.99]",
        isSelected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border bg-card"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Thumbnail */}
        <div className="w-[72px] h-[72px] shrink-0 rounded-lg overflow-hidden bg-muted">
          {thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailUrl}
              alt={cat.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                if (fallback) fallback.style.display = "flex";
              }}
            />
          ) : null}
          <div
            className={cn(
              "w-full h-full items-center justify-center text-3xl",
              thumbnailUrl ? "hidden" : "flex"
            )}
          >
            🐱
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Status + tags */}
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <CatStatusPill status={cat.status as ReportStatus} />
            {cat.tags?.includes("kitten") && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-[#E1F5EE] text-[#0F6E56] border-[#0F6E56]/30">
                幼貓
              </span>
            )}
            {extraTags.slice(0, 1).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-[#FCEBEB] text-[#791F1F] border-[#E24B4A]/30"
              >
                {TAG_LABELS[tag]}
              </span>
            ))}
          </div>

          {/* Name */}
          <p className="font-semibold text-sm truncate">{cat.name}</p>

          {/* Location + time */}
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            {locationText && (
              <span className="flex items-center gap-0.5 truncate">
                <MapPin className="h-3 w-3 shrink-0" />
                {locationText}
              </span>
            )}
            <span className="flex items-center gap-0.5 shrink-0">
              <Clock className="h-3 w-3" />
              {timeAgo}
            </span>
          </div>
        </div>

        {/* Distance + update count */}
        <div className="text-right shrink-0 pt-0.5">
          <p className="text-xs font-semibold text-foreground">{distanceText}</p>
          <p className="text-xs text-muted-foreground mt-1">
            更新 {cat.update_count} 次
          </p>
        </div>
      </div>
    </Link>
  );
}
