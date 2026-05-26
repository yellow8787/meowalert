"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Status = "loading" | "unsupported" | "enabled" | "denied" | "idle";

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
}

async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return null;
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export function EnableNotifications() {
  const [status, setStatus] = useState<Status>("loading");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    if (Notification.permission === "granted") {
      // Verify an active subscription actually exists in the browser
      getExistingSubscription().then((sub) => {
        setStatus(sub ? "enabled" : "idle");
      });
      return;
    }
    setStatus("idle");
  }, []);

  async function handleEnable() {
    setWorking(true);
    try {
      // 1. Request browser permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        toast.error("通知權限被拒絕，請在瀏覽器設定中開啟");
        return;
      }

      // 2. Wait for SW registration
      const reg = await navigator.serviceWorker.ready;

      // 3. Subscribe to Web Push
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) throw new Error("VAPID public key not configured");

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
      });

      // 4. Send subscription to server
      const p256dh = subscription.getKey("p256dh");
      const auth = subscription.getKey("auth");
      if (!p256dh || !auth) throw new Error("Push keys not available");

      const res = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh: arrayBufferToBase64(p256dh),
          auth: arrayBufferToBase64(auth),
          userAgent: navigator.userAgent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "訂閱失敗");

      setStatus("enabled");
      toast.success("已啟用推播通知 🔔");
    } catch (e) {
      console.error("[EnableNotifications]", e);
      toast.error(e instanceof Error ? e.message : "啟用通知失敗，請再試一次");
    } finally {
      setWorking(false);
    }
  }

  async function handleDisable() {
    setWorking(true);
    try {
      const sub = await getExistingSubscription();
      if (sub) {
        await sub.unsubscribe();
        await fetch("/api/notifications/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
      }
      setStatus("idle");
      toast.success("已關閉推播通知");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "關閉失敗");
    } finally {
      setWorking(false);
    }
  }

  // ── Render ────────────────────────────────────────────────

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>檢查通知狀態…</span>
      </div>
    );
  }

  if (status === "unsupported") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <BellOff className="h-4 w-4 shrink-0" />
        <span>此瀏覽器不支援推播通知</span>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-3 text-sm text-orange-700">
        <div className="flex items-center gap-2 font-medium mb-1">
          <BellOff className="h-4 w-4 shrink-0" />
          通知已被封鎖
        </div>
        <p className="text-xs text-orange-600">
          請在瀏覽器網址列旁的「🔒」圖示 → 網站設定 → 通知 → 允許，然後重新整理頁面。
        </p>
      </div>
    );
  }

  if (status === "enabled") {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <BellRing className="h-4 w-4 text-primary shrink-0" />
          <span className="font-medium">已啟用推播通知</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="text-xs text-muted-foreground h-7"
          onClick={handleDisable}
          disabled={working}
        >
          {working ? <Loader2 className="h-3 w-3 animate-spin" /> : "關閉"}
        </Button>
      </div>
    );
  }

  // idle
  return (
    <Button
      className="w-full gap-2"
      onClick={handleEnable}
      disabled={working}
    >
      {working ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Bell className="h-4 w-4" />
      )}
      {working ? "處理中…" : "啟用推播通知"}
    </Button>
  );
}
