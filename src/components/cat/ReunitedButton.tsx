"use client";

import { useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Props {
  catId: string;
}

export function ReunitedButton({ catId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/cats/${catId}/reunite`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "操作失敗");

      toast.success("🎉 太好了！貓咪平安歸來");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "發生錯誤");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        className="h-auto flex-col py-3 gap-1.5 text-pink-600 border-pink-300 hover:bg-pink-50"
        onClick={() => setOpen(true)}
      >
        <Heart className="h-5 w-5" />
        <span className="text-xs">找到了！</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-center">確認找到貓咪？</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-center">
            <span className="text-5xl block">🎉</span>
            <p className="text-sm text-muted-foreground">
              確定貓咪已找到了嗎？狀態會改為「已重逢」，感謝所有幫助過的人！
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
                disabled={submitting}
              >
                再想想
              </Button>
              <Button
                className="flex-1"
                onClick={handleConfirm}
                disabled={submitting}
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />確認中...</>
                ) : (
                  "確定！找到了"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
