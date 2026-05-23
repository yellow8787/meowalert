"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  className?: string;
  actions?: React.ReactNode;
}

export function BackHeader({ title, className, actions }: Props) {
  const router = useRouter();

  return (
    <div
      className={cn(
        "flex items-center gap-1 px-3 py-2.5 border-b bg-background sticky top-0 z-10",
        className
      )}
    >
      <button
        onClick={() => router.back()}
        className="p-1.5 -ml-1.5 rounded-lg hover:bg-muted transition-colors shrink-0"
        aria-label="返回"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <h1 className="flex-1 font-semibold text-sm truncate">{title}</h1>
      {actions}
    </div>
  );
}
