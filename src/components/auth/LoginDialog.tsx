"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GoogleSignInButton } from "./GoogleSignInButton";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirectTo?: string;
}

export function LoginDialog({ open, onOpenChange, redirectTo }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <div className="text-center text-4xl mb-1">🐱</div>
          <DialogTitle className="text-center text-lg">登入 MeowAlert</DialogTitle>
          <DialogDescription className="text-center text-sm">
            登入後可以回報街貓、接力更新、申請救援
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <GoogleSignInButton className="w-full" redirectTo={redirectTo} />
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            登入即表示你同意我們的{" "}
            <a href="/about/privacy" className="underline underline-offset-2">
              隱私政策
            </a>{" "}
            與{" "}
            <a href="/about/terms" className="underline underline-offset-2">
              服務條款
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
