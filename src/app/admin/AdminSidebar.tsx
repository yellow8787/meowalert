"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Ambulance, Cat, Users } from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "儀表板", icon: LayoutDashboard, exact: true },
  { href: "/admin/rescue", label: "救援申請", icon: Ambulance, exact: false },
  { href: "/admin/reports", label: "回報管理", icon: Cat, exact: false },
  { href: "/admin/users", label: "使用者管理", icon: Users, exact: false },
];

interface Props {
  adminName: string;
  adminAvatar: string | null;
}

export function AdminSidebar({ adminName, adminAvatar }: Props) {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r bg-muted/30 flex flex-col">
      {/* Logo */}
      <div className="px-4 py-4 border-b">
        <div className="text-sm font-bold text-primary">🐱 MeowAlert</div>
        <div className="text-xs text-muted-foreground mt-0.5">管理後台</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Admin user */}
      <div className="p-3 border-t flex items-center gap-2">
        {adminAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={adminAvatar} alt="" className="w-7 h-7 rounded-full object-cover" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-muted-foreground/20 flex items-center justify-center text-xs">
            {adminName.charAt(0)}
          </div>
        )}
        <div className="min-w-0">
          <div className="text-xs font-medium truncate">{adminName}</div>
          <div className="text-[10px] text-muted-foreground">Admin</div>
        </div>
      </div>
    </aside>
  );
}
