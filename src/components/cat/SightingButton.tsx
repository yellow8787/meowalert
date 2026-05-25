"use client";

import { useState } from "react";
import { z } from "zod";
import { Eye, Loader2, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LocationInput, type LocationValue } from "@/components/form/LocationInput";
import { toast } from "sonner";

const schema = z.object({
  location: z
    .object({ lat: z.number(), lng: z.number(), address: z.string() })
    .nullable()
    .refine((v): v is LocationValue => v !== null, { message: "請設定看到的位置" }),
});

function nowDatetimeLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

interface Props {
  catId: string;
}

export function SightingButton({ catId }: Props) {
  const [open, setOpen] = useState(false);
  const [location, setLocation] = useState<LocationValue | null>(null);
  const [spottedAt, setSpottedAt] = useState(nowDatetimeLocal());
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [locationError, setLocationError] = useState("");

  function reset() {
    setLocation(null);
    setSpottedAt(nowDatetimeLocal());
    setMessage("");
    setLocationError("");
  }

  async function handleSubmit() {
    const result = schema.safeParse({ location });
    if (!result.success) {
      setLocationError(result.error.issues[0]?.message ?? "請設定位置");
      return;
    }
    setLocationError("");
    setSubmitting(true);

    try {
      const res = await fetch(`/api/cats/${catId}/sightings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: location!.lat,
          lng: location!.lng,
          location_address: location!.address,
          message: message.trim() || undefined,
          spotted_at: new Date(spottedAt).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "送出失敗");

      toast.success("目擊紀錄已送出，飼主會收到通知");
      setOpen(false);
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "發生錯誤，請稍後再試");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className="h-auto flex-col py-3 gap-1.5 text-purple-600 border-purple-300 hover:bg-purple-50"
        onClick={() => setOpen(true)}
      >
        <Eye className="h-5 w-5" />
        <span className="text-xs">我看到了</span>
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="max-w-sm mx-auto max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-purple-600" />
              回報目擊地點
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                看到的位置 <span className="text-destructive">*</span>
              </label>
              <LocationInput
                value={location}
                onChange={(loc) => { setLocation(loc); setLocationError(""); }}
              />
              {locationError && (
                <p className="text-xs text-destructive">{locationError}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                看到的時間{" "}
                <span className="text-muted-foreground text-xs font-normal">(預設現在)</span>
              </label>
              <input
                type="datetime-local"
                value={spottedAt}
                onChange={(e) => setSpottedAt(e.target.value)}
                max={nowDatetimeLocal()}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                補充說明{" "}
                <span className="text-muted-foreground text-xs font-normal">(選填)</span>
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="貓咪狀況、確切位置描述..."
                maxLength={300}
                rows={3}
              />
            </div>

            <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />送出中...</>
              ) : (
                "送出目擊紀錄"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
