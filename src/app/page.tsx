"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useNearbyHelpfulCats } from "@/hooks/useNearbyHelpfulCats";
import { StatusFilterChips } from "@/components/filter/StatusFilterChips";
import { CatCard } from "@/components/cat/CatCard";
import type { ReportStatus } from "@/types/database";
import { Plus, AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";

const CatMap = dynamic(
  () => import("@/components/map/CatMap").then((m) => m.CatMap),
  { ssr: false }
);

const DEFAULT_STATUSES: ReportStatus[] = ["need", "pending", "lost", "rescued"];

export default function HomePage() {
  const { location } = useGeolocation();
  const [statusFilter, setStatusFilter] = useState<ReportStatus[]>(DEFAULT_STATUSES);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { cats, searchRadius, expanded, exhausted, loading, error } =
    useNearbyHelpfulCats(location, statusFilter);

  function handleSelectCat(id: string) {
    setSelectedId(id === "" ? null : id);
  }

  const selectedCat = cats.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)]">
      {/* Map area */}
      <div className="relative flex-none h-[45%] min-h-[220px]">
        {location ? (
          <CatMap
            userLat={location.lat}
            userLng={location.lng}
            cats={cats}
            selectedId={selectedId}
            onSelectCat={handleSelectCat}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Floating report button */}
        <Link
          href="/report"
          className="absolute bottom-3 right-3 z-[1000] flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-lg active:scale-95 transition-transform"
        >
          <Plus className="h-4 w-4" />
          回報
        </Link>
      </div>

      {/* List area */}
      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
        {/* Filter chips + radius info */}
        <div className="sticky top-0 z-10 bg-background border-b px-3 pt-2.5 pb-2 space-y-2">
          <StatusFilterChips value={statusFilter} onChange={setStatusFilter} />
          {!loading && (
            <p className="text-xs text-muted-foreground">
              {expanded
                ? `附近 ${searchRadius} 公里內共 ${cats.length} 筆`
                : `${searchRadius} 公里內共 ${cats.length} 筆`}
              {exhausted && " · 已顯示全部"}
            </p>
          )}
        </div>

        {/* List content */}
        <div className="flex-1 px-3 py-2 space-y-2">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && !loading && (
            <div className="flex items-center gap-2 py-4 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {!loading && !error && cats.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <p>附近目前沒有符合條件的回報</p>
            </div>
          )}

          {cats.map((cat) => (
            <CatCard
              key={cat.id}
              cat={cat}
              isSelected={cat.id === selectedId}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
