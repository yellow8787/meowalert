"use client";

import { useState } from "react";
import { MapPin, Eye, HeartPulse, HandHelping } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RescueApplicationDialog } from "@/components/rescue/RescueApplicationDialog";
import type { ReportStatus } from "@/types/database";

interface Props {
  catId: string;
  status: ReportStatus;
  isLoggedIn: boolean;
  reporterLineId?: string | null;
  reporterMessengerUrl?: string | null;
}

export function CatActions({
  catId,
  status,
  isLoggedIn,
  reporterLineId,
  reporterMessengerUrl,
}: Props) {
  const router = useRouter();
  const [rescueOpen, setRescueOpen] = useState(false);

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

  const hasContact = reporterLineId || reporterMessengerUrl;

  return (
    <>
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
              className="h-auto flex-col py-3 gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5"
              onClick={() => requireLogin(() => setRescueOpen(true))}
            >
              <HeartPulse className="h-5 w-5" />
              <span className="text-xs">我要救援</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto flex-col py-3 gap-1.5"
              onClick={() => {
                if (!isLoggedIn) {
                  toast.info("請先登入才能進行此操作", { description: "前往個人頁面登入" });
                  return;
                }
                if (hasContact) {
                  router.push(`/cat/${catId}/help`);
                } else {
                  toast.info("回報者尚未設定聯絡方式");
                }
              }}
            >
              <HandHelping className="h-5 w-5" />
              <span className="text-xs">我願意幫忙</span>
            </Button>
          </>
        )}
      </div>

      <RescueApplicationDialog
        catId={catId}
        open={rescueOpen}
        onOpenChange={setRescueOpen}
      />
    </>
  );
}
