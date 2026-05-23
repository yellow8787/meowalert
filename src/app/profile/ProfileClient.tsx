"use client";

import { useState } from "react";
import Image from "next/image";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/types/database";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { LoginDialog } from "@/components/auth/LoginDialog";
import { Button } from "@/components/ui/button";

interface LoggedInProps {
  user: User;
  profile: Profile | null;
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border p-4 flex-1">
      <span className="text-2xl font-bold">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function LoggedInView({ user, profile }: LoggedInProps) {
  const avatarUrl = profile?.avatar_url ?? user.user_metadata?.avatar_url;
  const displayName =
    profile?.display_name ?? user.user_metadata?.full_name ?? "使用者";
  const email = user.email ?? "";

  return (
    <div className="flex flex-col gap-6 p-4 max-w-md mx-auto w-full">
      {/* 頭像 + 名稱 + email */}
      <div className="flex flex-col items-center gap-3 pt-4">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt={displayName}
            width={80}
            height={80}
            className="rounded-full border-2 border-border"
          />
        ) : (
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center text-3xl">
            🐱
          </div>
        )}
        <div className="text-center">
          <p className="font-semibold text-lg">{displayName}</p>
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
      </div>

      {/* 個人統計 */}
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-3">個人統計</p>
        <div className="flex gap-3">
          <StatCard label="回報" value={profile?.report_count ?? 0} />
          <StatCard label="救援" value={profile?.rescue_count ?? 0} />
          <StatCard label="接力" value={profile?.relay_count ?? 0} />
        </div>
      </div>

      {/* 登出 */}
      <div className="pt-2">
        <SignOutButton />
      </div>
    </div>
  );
}

function LoggedOutView() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] gap-4 p-4">
      <div className="text-5xl">🐾</div>
      <h2 className="text-xl font-semibold">尚未登入</h2>
      <p className="text-sm text-muted-foreground text-center max-w-xs">
        登入後可以查看你的回報紀錄、統計數字和通知設定
      </p>
      <Button size="lg" onClick={() => setDialogOpen(true)}>
        登入 / 註冊
      </Button>
      <LoginDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

interface Props {
  user: User | null;
  profile: Profile | null;
}

export function ProfileClient({ user, profile }: Props) {
  if (!user) return <LoggedOutView />;
  return <LoggedInView user={user} profile={profile} />;
}
