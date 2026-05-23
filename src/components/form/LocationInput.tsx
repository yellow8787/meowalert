"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Crosshair, Map, Type, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const LocationPickerMap = dynamic(
  () => import("@/components/map/LocationPickerMap").then((m) => m.LocationPickerMap),
  { ssr: false, loading: () => <div className="h-[220px] rounded-xl bg-muted animate-pulse" /> }
);

export interface LocationValue {
  lat: number;
  lng: number;
  address: string;
}

interface Props {
  value: LocationValue | null;
  onChange: (loc: LocationValue) => void;
  className?: string;
}

type Mode = "gps" | "map" | "address";

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "zh-TW,zh;q=0.9" } }
    );
    const data = await res.json();
    const parts: string[] = data.display_name?.split(",") ?? [];
    return parts.slice(0, 3).join(",").trim() || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

export function LocationInput({ value, onChange, className }: Props) {
  const [mode, setMode] = useState<Mode>("gps");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [addressQuery, setAddressQuery] = useState("");
  const [addressLoading, setAddressLoading] = useState(false);

  const getGps = useCallback(async () => {
    if (!navigator.geolocation) {
      toast.error("瀏覽器不支援 GPS，請改用地圖或地址");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const address = await reverseGeocode(lat, lng);
        onChange({ lat, lng, address });
        setGpsLoading(false);
      },
      () => {
        toast.error("無法取得 GPS，請改用地圖或地址輸入");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [onChange]);

  // 進入 GPS 模式時自動取得
  useEffect(() => {
    if (mode === "gps" && !value) {
      getGps();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  async function handleMapPick(lat: number, lng: number) {
    const address = await reverseGeocode(lat, lng);
    onChange({ lat, lng, address });
  }

  async function searchAddress() {
    if (!addressQuery.trim()) return;
    setAddressLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addressQuery)}&format=json&limit=1&countrycodes=tw`,
        { headers: { "Accept-Language": "zh-TW,zh;q=0.9" } }
      );
      const data = await res.json();
      if (data?.[0]) {
        onChange({
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          address: data[0].display_name.split(",").slice(0, 3).join(",").trim(),
        });
      } else {
        toast.error("找不到此地址，請換個關鍵字試試");
      }
    } catch {
      toast.error("地址查詢失敗");
    } finally {
      setAddressLoading(false);
    }
  }

  const MODES = [
    { id: "gps" as const, icon: Crosshair, label: "我的位置" },
    { id: "map" as const, icon: Map, label: "地圖選點" },
    { id: "address" as const, icon: Type, label: "輸入地址" },
  ];

  return (
    <div className={cn("space-y-3", className)}>
      {/* Mode selector */}
      <div className="flex gap-2">
        {MODES.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-2 rounded-lg border text-xs transition-all",
              mode === id
                ? "border-primary bg-primary/5 text-primary font-medium"
                : "border-border text-muted-foreground hover:border-primary/40"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* GPS mode */}
      {mode === "gps" && (
        <div className="space-y-2">
          {value && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
              <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <span className="text-xs text-muted-foreground leading-relaxed">{value.address}</span>
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={getGps}
            disabled={gpsLoading}
          >
            {gpsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Crosshair className="h-4 w-4 mr-2" />
            )}
            {gpsLoading ? "取得中..." : value ? "重新取得 GPS" : "取得我的位置"}
          </Button>
        </div>
      )}

      {/* Map picker mode */}
      {mode === "map" && (
        <div className="space-y-2">
          <LocationPickerMap
            initialLat={value?.lat}
            initialLng={value?.lng}
            onPick={handleMapPick}
          />
          {value && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
              <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <span className="text-xs text-muted-foreground">{value.address}</span>
            </div>
          )}
        </div>
      )}

      {/* Address mode */}
      {mode === "address" && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="例如：信義路四段 45 號..."
              value={addressQuery}
              onChange={(e) => setAddressQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchAddress()}
            />
            <Button type="button" onClick={searchAddress} disabled={addressLoading}>
              {addressLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "搜尋"}
            </Button>
          </div>
          {value && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
              <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <span className="text-xs text-muted-foreground">{value.address}</span>
            </div>
          )}
        </div>
      )}

      {/* Coords display */}
      {value && (
        <p className="text-xs text-muted-foreground/60">
          {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
        </p>
      )}
    </div>
  );
}
