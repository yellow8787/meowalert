import { requireAdmin } from "@/lib/auth/is-admin";
import { AdminSidebar } from "./AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireAdmin();

  return (
    // Fixed overlay covering the root layout's BottomNav
    <div className="fixed inset-0 z-[60] bg-background flex">
      <AdminSidebar
        adminName={profile.display_name}
        adminAvatar={profile.avatar_url}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
