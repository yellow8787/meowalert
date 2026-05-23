import { cn } from "@/lib/utils";
import type { ReportStatus } from "@/types/database";

const STATUS_CONFIG: Record<
  ReportStatus,
  { label: string; className: string }
> = {
  need: {
    label: "緊急救援",
    className: "bg-[#FCEBEB] text-[#791F1F] border-[#E24B4A]/40",
  },
  pending: {
    label: "救援中",
    className: "bg-[#EBF2FC] text-[#1A4A7A] border-[#378ADD]/40",
  },
  rescued: {
    label: "已救援",
    className: "bg-[#EEF7E5] text-[#2D5A14] border-[#97C459]/40",
  },
  lost: {
    label: "協尋中",
    className: "bg-[#EEEDFE] text-[#3C3489] border-[#7F77DD]/40",
  },
  found: {
    label: "撿到家貓",
    className: "bg-[#EEEDFE] text-[#3C3489] border-[#7F77DD]/40",
  },
  reunited: {
    label: "已團圓",
    className: "bg-[#EEF7E5] text-[#2D5A14] border-[#97C459]/40",
  },
  archived: {
    label: "已歸檔",
    className: "bg-muted text-muted-foreground border-border",
  },
};

interface Props {
  status: ReportStatus;
  className?: string;
}

export function CatStatusPill({ status, className }: Props) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.need;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
