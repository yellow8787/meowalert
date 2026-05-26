"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, ShieldOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface Props {
  userId: string;
  isBanned: boolean;
  isSelf: boolean;
}

export function UserActions({ userId, isBanned, isSelf }: Props) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"ban" | "unban" | null>(null);
  const [banReason, setBanReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleBan() {
    if (!banReason.trim()) {
      toast.error("請填寫封禁原因");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_banned: true, banned_reason: banReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "操作失敗");
      toast.success("已封禁使用者");
      setDialog(null);
      setBanReason("");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "發生錯誤");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUnban() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_banned: false, banned_reason: null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "操作失敗");
      toast.success("已解除封禁");
      setDialog(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "發生錯誤");
    } finally {
      setSubmitting(false);
    }
  }

  if (isSelf) {
    return <span className="text-xs text-muted-foreground">(自己)</span>;
  }

  return (
    <>
      {isBanned ? (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1 text-green-600 border-green-300 hover:bg-green-50"
          onClick={() => setDialog("unban")}
        >
          <ShieldOff className="h-3 w-3" /> 解禁
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1 text-red-600 border-red-300 hover:bg-red-50"
          onClick={() => { setBanReason(""); setDialog("ban"); }}
        >
          <Ban className="h-3 w-3" /> 封禁
        </Button>
      )}

      {/* Ban dialog */}
      <Dialog open={dialog === "ban"} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>封禁使用者</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">封禁原因 <span className="text-destructive">*</span></label>
              <Textarea
                className="mt-1"
                rows={3}
                placeholder="請說明封禁原因"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                maxLength={200}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDialog(null)} disabled={submitting}>取消</Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleBan}
                disabled={submitting || !banReason.trim()}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "確認封禁"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unban dialog */}
      <Dialog open={dialog === "unban"} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>解除封禁</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">確定要解除此使用者的封禁狀態？</p>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDialog(null)} disabled={submitting}>取消</Button>
            <Button className="flex-1" onClick={handleUnban} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "確認解禁"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
