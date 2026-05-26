"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2 } from "lucide-react";
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
  rescueId: string;
}

export function RescueActions({ rescueId }: Props) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"approve" | "reject" | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(action: "approve" | "reject") {
    if (action === "reject" && !reviewNote.trim()) {
      toast.error("請填寫退回原因");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/rescue/${rescueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: action === "approve" ? "approved" : "rejected",
          review_note: reviewNote.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "操作失敗");
      toast.success(action === "approve" ? "已通過申請" : "已退回申請");
      setDialog(null);
      setReviewNote("");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "發生錯誤");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="flex gap-1.5">
        <Button
          size="sm"
          className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700"
          onClick={() => setDialog("approve")}
        >
          <Check className="h-3 w-3" /> 通過
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1 text-red-600 border-red-300 hover:bg-red-50"
          onClick={() => { setReviewNote(""); setDialog("reject"); }}
        >
          <X className="h-3 w-3" /> 退回
        </Button>
      </div>

      {/* Approve confirm */}
      <Dialog open={dialog === "approve"} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>確認通過救援申請？</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">申請者會收到通知，狀態將改為「已通過」。</p>
          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDialog(null)} disabled={submitting}>取消</Button>
            <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleSubmit("approve")} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "確認通過"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={dialog === "reject"} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>退回救援申請</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">退回原因 <span className="text-destructive">*</span></label>
              <Textarea
                className="mt-1"
                rows={3}
                placeholder="請說明退回原因，申請者會看到此訊息"
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                maxLength={200}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDialog(null)} disabled={submitting}>取消</Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => handleSubmit("reject")}
                disabled={submitting || !reviewNote.trim()}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "確認退回"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
