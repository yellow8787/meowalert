"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoginDialog } from "./LoginDialog";

interface Props {
  redirectTo?: string;
  message?: string;
}

export function LoginRequiredScreen({
  redirectTo,
  message = "請先登入",
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-4rem)] p-6 text-center">
      <span className="text-6xl mb-4">🐱</span>
      <h2 className="text-xl font-bold mb-2">{message}</h2>
      <p className="text-sm text-muted-foreground mb-6">
        加入 MeowAlert，一起幫助街貓
      </p>
      <Button size="lg" onClick={() => setOpen(true)}>
        使用 Google 登入
      </Button>

      <LoginDialog open={open} onOpenChange={setOpen} redirectTo={redirectTo} />
    </div>
  );
}
