import webpush from "web-push";
import { createServiceClient } from "@/lib/supabase/admin";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  const supabase = createServiceClient();

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh_key, auth_key, failed_attempts")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error) {
    console.error("[sendPushToUser] fetch subs:", error.message);
    return { sent: 0, failed: 0 };
  }
  if (!subs?.length) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh_key, auth: sub.auth_key },
        },
        JSON.stringify(payload)
      );
      sent++;

      await supabase
        .from("push_subscriptions")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", sub.id);
    } catch (err: unknown) {
      failed++;
      const statusCode = (err as { statusCode?: number }).statusCode;
      console.error("[sendPushToUser] send failed:", statusCode, (err as Error).message);

      if (statusCode === 410 || statusCode === 404) {
        // Endpoint expired — mark inactive
        await supabase
          .from("push_subscriptions")
          .update({ is_active: false })
          .eq("id", sub.id);
      } else {
        // Transient failure — increment counter
        await supabase
          .from("push_subscriptions")
          .update({ failed_attempts: (sub.failed_attempts ?? 0) + 1 })
          .eq("id", sub.id);
      }
    }
  }

  return { sent, failed };
}

export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  body: string;
  relatedReportId?: string;
  relatedUrl?: string;
}) {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      related_report_id: params.relatedReportId ?? null,
      related_url: params.relatedUrl ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[createNotification] insert:", error.message);
    return null;
  }

  const result = await sendPushToUser(params.userId, {
    title: params.title,
    body: params.body,
    url: params.relatedUrl ?? "/",
  });

  await supabase
    .from("notifications")
    .update({
      is_sent_push: result.sent > 0,
      sent_push_at: result.sent > 0 ? new Date().toISOString() : null,
    })
    .eq("id", data.id);

  return data;
}
