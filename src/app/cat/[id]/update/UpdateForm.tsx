"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BackHeader } from "@/components/layout/BackHeader";
import { PhotoUpload } from "@/components/form/PhotoUpload";
import { LocationInput, type LocationValue } from "@/components/form/LocationInput";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  catId: string;
  updateType: "moved" | "spotted";
}

async function getGps(): Promise<{ lat: number; lng: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000, maximumAge: 60000 }
    );
  });
}

export function UpdateForm({ catId, updateType }: Props) {
  const router = useRouter();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [newLocation, setNewLocation] = useState<LocationValue | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const typeLabel = updateType === "moved" ? "換位置" : "再次目擊";
  const canSubmit =
    !!photoFile && (updateType !== "moved" || !!newLocation) && !submitting;

  async function handleSubmit() {
    if (!photoFile) {
      toast.error("請先拍照或選擇照片");
      return;
    }
    if (updateType === "moved" && !newLocation) {
      toast.error("換位置時請標記新位置");
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading("上傳中...");

    try {
      const gps = await getGps();

      const formData = new FormData();
      formData.set("type", updateType);
      formData.set("photo", photoFile);
      if (message.trim()) formData.set("message", message.trim());
      if (gps) {
        formData.set("user_gps_lat", gps.lat.toString());
        formData.set("user_gps_lng", gps.lng.toString());
      }
      if (updateType === "moved" && newLocation) {
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
          toast.error(
            `你距離貓咪太遠（${data.user_distance_km?.toFixed(1)} 公里），請確認你在現場`,
            { id: toastId, duration: 5000 }
          );
          return;
        }
        throw new Error(data.error ?? "上傳失敗");
      }

      toast.success("接力成功！感謝你的更新 🐱", { id: toastId });
      router.push(`/cat/${catId}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "發生錯誤，請稍後再試", {
        id: toastId,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
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
            <span className="text-muted-foreground text-xs font-normal">
              (選填)
            </span>
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
        {updateType === "moved" && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              新位置 <span className="text-destructive">*</span>
            </label>
            <LocationInput value={newLocation} onChange={setNewLocation} />
          </div>
        )}
      </div>

      {/* 送出 */}
      <div className="px-4 py-4 border-t bg-background">
        <Button className="w-full" onClick={handleSubmit} disabled={!canSubmit}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          送出{typeLabel}
        </Button>
      </div>
    </div>
  );
}
