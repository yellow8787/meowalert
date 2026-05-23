"use client";

import { Phone, Navigation, Star, Clock } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Hospital } from "@/lib/google-places";

interface Props {
  hospital: Hospital;
}

export function HospitalCard({ hospital }: Props) {
  const distanceText =
    hospital.distance_m < 1000
      ? `${hospital.distance_m} 公尺`
      : `${(hospital.distance_m / 1000).toFixed(1)} 公里`;

  const openStatus = hospital.is_24h
    ? { label: "24 小時", className: "text-emerald-600 bg-emerald-50 border-emerald-200" }
    : hospital.open_now === true
    ? { label: "營業中", className: "text-emerald-600 bg-emerald-50 border-emerald-200" }
    : hospital.open_now === false
    ? { label: "休息中", className: "text-red-600 bg-red-50 border-red-200" }
    : null;

  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-snug truncate">{hospital.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{hospital.address}</p>
        </div>
        <span className="text-xs font-semibold text-foreground shrink-0 pt-0.5">{distanceText}</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {openStatus && (
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
              openStatus.className
            )}
          >
            <Clock className="h-3 w-3" />
            {openStatus.label}
          </span>
        )}
        {hospital.rating !== null && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {hospital.rating.toFixed(1)}
            <span className="text-muted-foreground/60">({hospital.user_ratings_total})</span>
          </span>
        )}
      </div>

      <div className="flex gap-2">
        {hospital.phone && (
          <a
            href={`tel:${hospital.phone}`}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "flex-1 text-xs h-8 gap-1.5"
            )}
          >
            <Phone className="h-3.5 w-3.5" />
            {hospital.phone}
          </a>
        )}
        <a
          href={hospital.google_maps_url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "text-xs h-8 gap-1.5",
            hospital.phone ? "" : "flex-1"
          )}
        >
          <Navigation className="h-3.5 w-3.5" />
          導航
        </a>
      </div>
    </div>
  );
}
