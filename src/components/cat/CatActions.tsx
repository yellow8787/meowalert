"use client";

import { MapPin, Eye, HeartPulse, HandHelping } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ReportStatus } from "@/types/database";

interface Props {
  catId: string;
  status: ReportStatus;
  isLoggedIn: boolean;
}

export function CatActions({ catId, status, isLoggedIn }: Props) {
  const router = useRouter();

  function requireLogin(action: () => void) {
    if (!isLoggedIn) {
      toast.info("請先登入才能進行此操作", { description: "前往個人頁面登入" });
      return;
    }
    action();
  }

  const canRelay = status === "need" || status === "pending";
  const canRescue = status === "need";

  if (!canRelay && !canRescue) return null;

  return (
    <div className="grid grid-cols-2 gap-2">
      {canRelay && (
        <>
          <Button
            variant="outline"
            className="h-auto flex-col py-3 gap-1.5"
            onClick={() =>
              requireLogin(() => router.push(`/cat/${catId}/update?type=moved`))
            }
          >
            <MapPin className="h-5 w-5" />
            <span className="text-xs">換位置</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto flex-col py-3 gap-1.5"
            onClick={() =>
              requireLogin(() => router.push(`/cat/${catId}/update?type=spotted`))
            }
          >
            <Eye className="h-5 w-5" />
            <span className="text-xs">再次目擊</span>
          </Button>
        </>
      )}

      {canRescue && (
        <>
          <Button
            variant="outline"
            className="h-auto flex-col py-3 gap-1.5 opacity-60"
            onClick={() => toast.info("救援功能 Milestone 5 推出，敬請期待！")}
          >
            <HeartPulse className="h-5 w-5" />
            <span className="text-xs">我要救援</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto flex-col py-3 gap-1.5 opacity-60"
            onClick={() => toast.info("幫忙功能 Milestone 5 推出，敬請期待！")}
          >
            <HandHelping className="h-5 w-5" />
            <span className="text-xs">我願意幫忙</span>
          </Button>
        </>
      )}
    </div>
  );
}
