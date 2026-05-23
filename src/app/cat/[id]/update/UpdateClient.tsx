"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BackHeader } from "@/components/layout/BackHeader";
import { PhotoUpload } from "@/components/form/PhotoUpload";
import { LocationInput, type LocationValue } from "@/components/form/LocationInput";
import { DistanceLimitDialog } from "@/components/common/DistanceLimitDialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { LoginDialog } from "@/components/auth/LoginDialog";
import { useGeolocation } from "@/hooks/useGeolocation";
import { canRelay } from "@/lib/geo/distance-limit";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  catId: string;
}

interface DistanceBlock {
  open: boolean;
  distanceKm: number;
  reason: string;
}

export function UpdateClient({ catId }: Props) {
  const searchParams = useSearchParams();
  const type = (searchParams.get("type") ?? "spotted") as "moved" | "spotted";
  const router = useRouter();

  const { user, loading: authLoading } = useAuth();
  const { location: gpsLocation } = useGeolocation();

  const [loginOpen, setLoginOpen] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [newLocation, setNewLocation] = useState<LocationValue | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [distanceBlock, setDistanceBlock] = useState<DistanceBlock | null>(null);
  const [catLocation, setCatLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    fetch(`/api/cats/${catId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.cat) {
          setCatLocation({
            lat: data.cat.location_blurred_lat,
            lng: data.cat.location_blurred_lng,
          });
        }
      })
      .catch(() => {});
  }, [catId]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100dvh-4rem)]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-4rem)] p-4 gap-4">
        <p className="text-sm text-muted-foreground text-center">
          請先登入才能進行接力更新
        </p>
        <Button onClick={() => setLoginOpen(true)}>登入</Button>
        <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
      </div>
    );
  }

  async function handleSubmit() {
    if (!photoFile) {
      toast.error("請先拍照或選擇照片");
      return;
    }
    if (type === "moved" && !newLocation) {
      toast.error("換位置時請標記新位置");
      return;
    }

    if (gpsLocation && catLocation) {
      const result = canRelay(gpsLocation, catLocation);
      if (!result.allowed) {
        setDistanceBlock({ open: true, distanceKm: result.distanceKm, reason: result.reason });
        return;
      }
    }

    setSubmitting(true);
    const toastId = toast.loading("上傳中...");

    try {
      const formData = new FormData();
      formData.set("type", type);
      formData.set("photo", photoFile!);
      if (message.trim()) formData.set("message", message.trim());
      if (gpsLocation) {
        formData.set("user_gps_lat", gpsLocation.lat.toString());
        formData.set("user_gps_lng", gpsLocation.lng.toString());
      }
      if (type === "moved" && newLocation) {
        formData.set("new_location_lat", newLocation.lat.toString());
        formData.set("new_location_lng", newLocation.lng.toString());
        formData.set("new_location_address", newLocation.address);
      }

      const res = await fetch(`/api/cats/${catId}/updates`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "distance_exceeded") {
          toast.dismiss(toastId);
          setDistanceBlock({
            open: true,
            distanceKm: data.user_distance_km,
            reason: data.message,
          });
          return;
        }
        throw new Error(data.error ?? "上傳失敗");
      }

      toast.success("接力成功！感謝你的更新 🐱", { id: toastId });
      router.push(`/cat/${catId}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "發生錯誤，請稍後再試", { id: toastId });
    } finally {
      setSubmitting(false);
    }
  }

  const typeLabel = type === "moved" ? "換位置" : "再次目擊";
  const canSubmit = !!photoFile && (type !== "moved" || !!newLocation) && !submitting;

  return (
    <>
      <div className="flex flex-col min-h-[calc(100dvh-4rem)]">
        <BackHeader title={typeLabel} />

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {/* 照片（必填） */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              照片 <span className="text-destructive">*</span>
            </label>
            <PhotoUpload
              onFile={(file) => setPhotoFile(file)}
              onClear={() => setPhotoFile(null)}
            />
          </div>

          {/* 備註（選填） */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              備註{" "}
              <span className="text-muted-foreground text-xs font-normal">(選填)</span>
            </label>
            <Textarea
              placeholder="描述你看到的狀況..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/500
            </p>
          </div>

          {/* 新位置（換位置時必填） */}
          {type === "moved" && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                新位置 <span className="text-destructive">*</span>
              </label>
              <LocationInput value={newLocation} onChange={setNewLocation} />
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="px-4 py-4 border-t bg-background">
          <Button className="w-full" onClick={handleSubmit} disabled={!canSubmit}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            送出{typeLabel}
          </Button>
        </div>
      </div>

      {distanceBlock && (
        <DistanceLimitDialog
          open={distanceBlock.open}
          onClose={() => setDistanceBlock(null)}
          distanceKm={distanceBlock.distanceKm}
          reason={distanceBlock.reason}
        />
      )}
    </>
  );
}
