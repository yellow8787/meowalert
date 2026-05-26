"use client";

import { useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function TestPushButton() {
  const [loading, setLoading] = useState(false);

  async function handleTest() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/test-push", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success("推播已送出，請留意通知");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "推播失敗");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={handleTest} disabled={loading} variant="outline" className="gap-2">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
      {loading ? "送出中…" : "送測試通知給自己"}
    </Button>
  );
}
