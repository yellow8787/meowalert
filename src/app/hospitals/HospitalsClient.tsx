"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Loader2, MapPin, Search } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { HospitalCard } from "@/components/hospital/HospitalCard";
import type { Hospital } from "@/lib/google-places";

const HospitalMap = dynamic(() => import("./HospitalMap"), { ssr: false });

type FilterType = "all" | "open" | "24h";

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "open", label: "營業中" },
  { value: "24h", label: "24 小時" },
];

export function HospitalsClient() {
  const { location, denied, loading: geoLoading } = useGeolocation();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (geoLoading) return;

    setLoading(true);
    setError(null);

    fetch(`/api/hospitals/nearby?lat=${location.lat}&lng=${location.lng}`)
      .then((r) => r.json())
      .then((data) => {
        setHospitals(data.hospitals ?? []);
      })
      .catch(() => setError("無法取得附近醫院，請稍後再試"))
      .finally(() => setLoading(false));
  }, [location.lat, location.lng, geoLoading]);

  const filtered = hospitals.filter((h) => {
    if (filter === "24h") return h.is_24h;
    if (filter === "open") return h.is_24h || h.open_now === true;
    return true;
  });

  function handleSelectHospital(id: string) {
    setSelectedId(id);
    const el = listRef.current?.querySelector(`[data-id="${id}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)]">
      {/* Map */}
      <div className="h-[40%] shrink-0 relative bg-muted">
        {!geoLoading && (
          <HospitalMap
            userLat={location.lat}
            userLng={location.lng}
            hospitals={filtered}
            selectedId={selectedId}
            onSelect={handleSelectHospital}
          />
        )}
        {denied && (
          <div className="absolute bottom-2 left-2 right-2 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-muted-foreground flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            使用預設位置（台北 101），允許定位可獲得更準確結果
          </div>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 px-3 py-2.5 border-b overflow-x-auto shrink-0">
        {FILTER_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap transition-colors ${
              filter === value
                ? "bg-foreground text-background border-foreground"
                : "bg-background text-muted-foreground border-border hover:border-muted-foreground/50"
            }`}
          >
            {label}
          </button>
        ))}
        {!loading && !error && (
          <span className="ml-auto text-xs text-muted-foreground self-center shrink-0">
            {filtered.length} 間
          </span>
        )}
      </div>

      {/* List */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {loading || geoLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">搜尋附近動物醫院...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 px-4 text-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-4 text-center text-muted-foreground">
            <Search className="h-8 w-8 opacity-40" />
            <p className="text-sm">
              {filter !== "all"
                ? "目前篩選條件下沒有醫院，試試「全部」"
                : "附近 5 公里內未找到動物醫院"}
            </p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {filtered.map((h) => (
              <div
                key={h.place_id}
                data-id={h.place_id}
                onClick={() => setSelectedId(h.place_id)}
              >
                <HospitalCard hospital={h} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
