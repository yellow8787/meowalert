"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  distanceKm: number;
  reason: string;
}

export function DistanceLimitDialog({ open, onClose, distanceKm, reason }: Props) {
  function handleReport() {
    toast.info("感謝你的回報！我們會審查這筆回報。");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <DialogTitle>距離超出範圍</DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-1.5 py-1">
          <p className="text-sm">{reason}</p>
          <p className="text-xs text-muted-foreground">
            請確認你真的在現場，才能進行接力更新。
          </p>
        </div>
        <DialogFooter className="gap-2 flex-col sm:flex-col">
          <Button className="w-full" onClick={onClose}>
            確定，我回去確認
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReport}
            className="text-muted-foreground text-xs w-full"
          >
            舉報此回報位置有誤
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
