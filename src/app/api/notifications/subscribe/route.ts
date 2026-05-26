import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// POST: save / update subscription
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const body = await request.json();
  const { endpoint, p256dh, auth, userAgent } = body as {
    endpoint: string;
    p256dh: string;
    auth: string;
    userAgent?: string;
  };

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "缺少必要的訂閱資訊" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint,
        p256dh_key: p256dh,
        auth_key: auth,
        user_agent: userAgent ?? null,
        is_active: true,
        last_used_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    )
    .select("id")
    .single();

  if (error) {
    console.error("[api/notifications/subscribe POST]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data?.id });
}

// DELETE: deactivate subscription
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const body = await request.json();
  const { endpoint } = body as { endpoint: string };

  if (!endpoint) {
    return NextResponse.json({ error: "缺少 endpoint" }, { status: 400 });
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .update({ is_active: false })
    .eq("endpoint", endpoint)
    .eq("user_id", user.id);

  if (error) {
    console.error("[api/notifications/subscribe DELETE]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
