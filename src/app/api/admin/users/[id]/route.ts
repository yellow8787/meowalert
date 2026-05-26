import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/auth/is-admin";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

async function getAdminSupabase() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, authorized: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return { supabase, user, authorized: isAdmin(profile?.role) };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: targetId } = await params;
  const { supabase, user, authorized } = await getAdminSupabase();

  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  if (!authorized) return NextResponse.json({ error: "權限不足" }, { status: 403 });

  // Prevent self-ban
  if (targetId === user.id) {
    return NextResponse.json({ error: "不能對自己執行此操作" }, { status: 400 });
  }

  const body = await request.json();
  const { is_banned, banned_reason } = body as {
    is_banned: boolean;
    banned_reason: string | null;
  };

  const updatePayload: Record<string, unknown> = { is_banned };

  if (is_banned) {
    updatePayload.banned_at = new Date().toISOString();
    updatePayload.banned_reason = banned_reason ?? null;
  } else {
    updatePayload.banned_at = null;
    updatePayload.banned_reason = null;
  }

  const { error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", targetId);

  if (error) {
    console.error("[api/admin/users/[id]]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
