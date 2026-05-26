"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Trash2, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface Props {
  reportId: string;
  currentStatus: string;
}

export function ReportActions({ reportId, currentStatus }: Props) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"archive" | "unarchive" | "delete" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isArchived = currentStatus === "archived";

  async function handleAction(action: "archive" | "unarchive" | "delete") {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: action === "delete" ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        ...(action !== "delete" && {
          body: JSON.stringify({
            status: action === "archive" ? "archived" : "need",
          }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "操作失敗");
      const msg =
        action === "archive" ? "已封存回報" :
        action === "unarchive" ? "已恢復回報" :
        "已刪除回報";
      toast.success(msg);
      setDialog(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "發生錯誤");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="flex gap-1.5 flex-wrap">
        {isArchived ? (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={() => setDialog("unarchive")}
          >
            <RefreshCw className="h-3 w-3" /> 恢復
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 text-orange-600 border-orange-300 hover:bg-orange-50"
            onClick={() => setDialog("archive")}
          >
            <Archive className="h-3 w-3" /> 封存
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1 text-red-600 border-red-300 hover:bg-red-50"
          onClick={() => setDialog("delete")}
        >
          <Trash2 className="h-3 w-3" /> 刪除
        </Button>
      </div>

      {/* Archive confirm */}
      <Dialog open={dialog === "archive"} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>確認封存此回報？</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">回報狀態將改為「已封存」，不會出現在一般列表中，但資料保留。</p>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDialog(null)} disabled={submitting}>取消</Button>
            <Button className="flex-1" onClick={() => handleAction("archive")} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "確認封存"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unarchive confirm */}
      <Dialog open={dialog === "unarchive"} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>確認恢復此回報？</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">狀態將改回「需救援」，回報會重新出現在列表中。</p>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDialog(null)} disabled={submitting}>取消</Button>
            <Button className="flex-1" onClick={() => handleAction("unarchive")} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "確認恢復"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={dialog === "delete"} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>⚠️ 確認刪除此回報？</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">此操作<span className="font-semibold text-destructive">不可逆</span>，回報及所有照片將永久刪除。</p>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDialog(null)} disabled={submitting}>取消</Button>
            <Button variant="destructive" className="flex-1" onClick={() => handleAction("delete")} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "確認刪除"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
