"use client";

import { cn } from "@/lib/utils";
import type { ReportStatus } from "@/types/database";

const FILTERS: Array<{
  status: ReportStatus;
  label: string;
  activeClass: string;
}> = [
  {
    status: "need",
    label: "🔴 緊急",
    activeClass: "bg-[#FCEBEB] text-[#791F1F] border-[#E24B4A]",
  },
  {
    status: "pending",
    label: "🔵 救援中",
    activeClass: "bg-[#EBF2FC] text-[#1A4A7A] border-[#378ADD]",
  },
  {
    status: "lost",
    label: "🟣 走失家貓",
    activeClass: "bg-[#EEEDFE] text-[#3C3489] border-[#7F77DD]",
  },
  {
    status: "found",
    label: "🟠 撿到街貓",
    activeClass: "bg-[#FFF3E8] text-[#7A3A00] border-[#F97316]",
  },
  {
    status: "rescued",
    label: "🟢 已救援",
    activeClass: "bg-[#EEF7E5] text-[#2D5A14] border-[#97C459]",
  },
];

interface Props {
  value: ReportStatus[];
  onChange: (statuses: ReportStatus[]) => void;
}

export function StatusFilterChips({ value, onChange }: Props) {
  function toggle(status: ReportStatus) {
    if (value.includes(status)) {
      if (value.length === 1) return; // 至少保留一個
      onChange(value.filter((s) => s !== status));
    } else {
      onChange([...value, status]);
    }
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {FILTERS.map(({ status, label, activeClass }) => {
        const isActive = value.includes(status);
        return (
          <button
            key={status}
            onClick={() => toggle(status)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border transition-all",
              isActive
                ? activeClass
                : "bg-background text-muted-foreground border-border hover:border-primary/40"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
