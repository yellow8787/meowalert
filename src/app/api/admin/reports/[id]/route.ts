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

// PATCH: change report status (archive → status='archived', restore → status='need')
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase, user, authorized } = await getAdminSupabase();

  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  if (!authorized) return NextResponse.json({ error: "權限不足" }, { status: 403 });

  const body = await request.json();
  const { status } = body as { status: string };

  if (!status) return NextResponse.json({ error: "缺少 status" }, { status: 400 });

  const { error } = await supabase
    .from("reports")
    .update({ status })
    .eq("id", id);

  if (error) {
    console.error("[api/admin/reports/[id] PATCH]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE: hard delete report + photos
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase, user, authorized } = await getAdminSupabase();

  if (!user) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  if (!authorized) return NextResponse.json({ error: "權限不足" }, { status: 403 });

  // Fetch storage paths before deleting rows
  const { data: photoRows } = await supabase
    .from("report_photos")
    .select("storage_path")
    .eq("report_id", id);

  if (photoRows && photoRows.length > 0) {
    const paths = photoRows.map((p) => p.storage_path);
    const { error: storageError } = await supabase.storage
      .from("report-photos")
      .remove(paths);
    if (storageError) {
      console.error("[api/admin/reports/[id] DELETE storage]", storageError.message);
    }
  }

  // Delete the report (cascades to report_photos, report_updates, etc. via FK)
  const { data: deleted, error } = await supabase
    .from("reports")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("[api/admin/reports/[id] DELETE]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!deleted || deleted.length === 0) {
    // RLS blocked silently — no rows matched the policy
    return NextResponse.json({ error: "刪除失敗，可能無權限或資料不存在" }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
