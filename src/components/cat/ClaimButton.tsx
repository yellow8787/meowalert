"use client";

import { useState } from "react";
import { Home, Loader2, MessageCircle, Phone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Reporter {
  display_name: string | null;
  line_id: string | null;
  messenger_url: string | null;
}

interface Props {
  catId: string;
}

export function ClaimButton({ catId }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<"confirm" | "contact">("confirm");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reporter, setReporter] = useState<Reporter | null>(null);

  function handleOpen() {
    setStep("confirm");
    setReporter(null);
    setOpen(true);
  }

  async function handleClaim() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/cats/${catId}/claim`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "操作失敗");

      toast.success("已標記為認領，請聯絡回報者！");
      setReporter(data.reporter ?? null);
      setStep("contact");
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
        className="h-auto flex-col py-3 gap-1.5 text-green-600 border-green-300 hover:bg-green-50"
        onClick={handleOpen}
      >
        <Home className="h-5 w-5" />
        <span className="text-xs">我是飼主</span>
      </Button>

      <Dialog open={open} onOpenChange={(v) => setOpen(v)}>
        <DialogContent className="max-w-sm mx-auto">
          {step === "confirm" ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-center">確認認領</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2 text-center">
                <span className="text-5xl block">🏠</span>
                <p className="text-sm text-muted-foreground">
                  確定這是你的貓嗎？狀態將改為「已重逢」，回報者會收到通知。
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setOpen(false)}
                    disabled={submitting}
                  >
                    取消
                  </Button>
                  <Button className="flex-1" onClick={handleClaim} disabled={submitting}>
                    {submitting ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" />確認中...</>
                    ) : (
                      "確定認領"
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-center">🎉 認領成功！</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <p className="text-sm text-center text-muted-foreground">
                  請聯絡回報者{reporter?.display_name ? `「${reporter.display_name}」` : ""}安排交接。
                </p>
                <div className="space-y-2">
                  {reporter?.line_id && (
                    <a
                      href={`https://line.me/R/ti/p/~${reporter.line_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        buttonVariants({ variant: "default" }),
                        "w-full gap-2 bg-[#06C755] hover:bg-[#05b04d] text-white border-transparent"
                      )}
                    >
                      <MessageCircle className="h-4 w-4" />
                      LINE 聯絡（{reporter.line_id}）
                    </a>
                  )}
                  {reporter?.messenger_url && (
                    <a
                      href={reporter.messenger_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        buttonVariants({ variant: "default" }),
                        "w-full gap-2 bg-[#0084FF] hover:bg-[#0070d9] text-white border-transparent"
                      )}
                    >
                      <Phone className="h-4 w-4" />
                      Messenger 聯絡
                    </a>
                  )}
                  {!reporter?.line_id && !reporter?.messenger_url && (
                    <p className="text-xs text-center text-muted-foreground">
                      回報者尚未設定公開聯絡方式，請透過回報記錄中的其他管道聯繫。
                    </p>
                  )}
                </div>
                <Button variant="outline" className="w-full" onClick={() => setOpen(false)}>
                  關閉
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
