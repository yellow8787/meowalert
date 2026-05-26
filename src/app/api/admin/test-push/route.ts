import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/send-push";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" && profile?.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await createNotification({
    userId: user.id,
    type: "admin_notice",
    title: "🎉 推播測試",
    body: "如果你看到這則通知，代表推播系統 work!",
    relatedUrl: "/",
  });

  if (!result) {
    return NextResponse.json({ error: "Failed to create notification" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, notificationId: result.id });
}
