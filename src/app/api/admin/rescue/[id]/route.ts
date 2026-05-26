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
  const { id } = await params;
  const { supabase, user, authorized } = await getAdminSupabase();

  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  if (!authorized) return NextResponse.json({ error: "權限不足" }, { status: 403 });

  const body = await request.json();
  const { status, review_note } = body as {
    status: "approved" | "rejected";
    review_note: string | null;
  };

  if (!["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "無效的狀態" }, { status: 400 });
  }
  if (status === "rejected" && !review_note?.trim()) {
    return NextResponse.json({ error: "退回時必須填寫原因" }, { status: 400 });
  }

  const { error } = await supabase
    .from("rescue_applications")
    .update({
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_note: review_note ?? null,
    })
    .eq("id", id);

  if (error) {
    console.error("[api/admin/rescue/[id]]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
