import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { UserRole } from "@/types/database";

export function isAdmin(role: UserRole | string | null | undefined): boolean {
  return role === "admin" || role === "superadmin";
}

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, role")
    .eq("id", user.id)
    .single();

  if (!isAdmin(profile?.role)) redirect("/");

  return { user, profile: profile! };
}
