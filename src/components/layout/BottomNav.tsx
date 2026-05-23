"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, PlusCircle, Hospital, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { LoginDialog } from "@/components/auth/LoginDialog";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);

  function handleReportClick(e: React.MouseEvent) {
    e.preventDefault();
    // Only show the dialog when we're certain the user isn't logged in.
    // While loading is true we don't yet know — navigate optimistically;
    // the server-rendered /report page will show LoginRequiredScreen if needed.
    if (!loading && !user) {
      setLoginOpen(true);
      return;
    }
    router.push("/report");
  }

  const isReportActive = pathname.startsWith("/report");

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background safe-area-pb">
        <div className="flex h-16 items-center justify-around max-w-lg mx-auto px-2">
          {/* 首頁 */}
          <Link
            href="/"
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]",
              pathname === "/" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Home className="h-5 w-5" strokeWidth={pathname === "/" ? 2.5 : 2} />
            <span className="text-xs font-medium">首頁</span>
          </Link>

          {/* 回報 — auth-gated */}
          <button
            onClick={handleReportClick}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]",
              isReportActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <PlusCircle className="h-5 w-5" strokeWidth={isReportActive ? 2.5 : 2} />
            <span className="text-xs font-medium">回報</span>
          </button>

          {/* 醫院 */}
          <Link
            href="/hospitals"
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]",
              pathname.startsWith("/hospitals") ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Hospital className="h-5 w-5" strokeWidth={pathname.startsWith("/hospitals") ? 2.5 : 2} />
            <span className="text-xs font-medium">醫院</span>
          </Link>

          {/* 我的 */}
          <Link
            href="/profile"
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]",
              pathname.startsWith("/profile") ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <User className="h-5 w-5" strokeWidth={pathname.startsWith("/profile") ? 2.5 : 2} />
            <span className="text-xs font-medium">我的</span>
          </Link>
        </div>
      </nav>

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} redirectTo="/report" />
    </>
  );
}
