import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BackHeader } from "@/components/layout/BackHeader";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HandHelping, MessageCircle, Phone } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function HelpPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/cat/${id}`);

  const { data: report } = await supabase
    .from("reports")
    .select("id, name, created_by")
    .eq("id", id)
    .maybeSingle();

  if (!report) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, line_id, messenger_url")
    .eq("id", report.created_by)
    .maybeSingle();

  const hasLine = !!profile?.line_id;
  const hasMessenger = !!profile?.messenger_url;
  const reporterName = profile?.display_name ?? "回報者";

  return (
    <div className="flex flex-col min-h-[calc(100dvh-4rem)]">
      <BackHeader title="我願意幫忙" />

      <div className="flex-1 px-4 py-8 flex flex-col items-center gap-6 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <HandHelping className="h-8 w-8 text-primary" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-xl font-bold">感謝你願意伸出援手！</h1>
          <p className="text-sm text-muted-foreground">
            請透過以下方式聯絡{" "}
            <span className="font-medium text-foreground">{reporterName}</span>，
            告知你可以協助{" "}
            <span className="font-medium text-foreground">{report.name}</span> 的救援。
          </p>
        </div>

        <div className="w-full max-w-sm space-y-3">
          {hasLine && (
            <a
              href={`https://line.me/R/ti/p/~${profile!.line_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "default", size: "default" }),
                "w-full gap-2 bg-[#06C755] hover:bg-[#05b04d] text-white border-transparent"
              )}
            >
              <MessageCircle className="h-4 w-4" />
              透過 LINE 聯絡（{profile!.line_id}）
            </a>
          )}

          {hasMessenger && (
            <a
              href={profile!.messenger_url!}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "default", size: "default" }),
                "w-full gap-2 bg-[#0084FF] hover:bg-[#0070d9] text-white border-transparent"
              )}
            >
              <Phone className="h-4 w-4" />
              透過 Messenger 聯絡
            </a>
          )}

          {!hasLine && !hasMessenger && (
            <div className="rounded-xl border border-border bg-muted/30 p-6 space-y-2">
              <p className="text-sm font-medium">回報者尚未設定聯絡方式</p>
              <p className="text-xs text-muted-foreground">
                你可以在貓咪詳情頁的接力記錄中查看是否有其他志工的回報資訊。
              </p>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground max-w-xs">
          請說明你的幫助方式（例如：可以協助中途照護、送醫等），方便回報者評估。
        </p>
      </div>
    </div>
  );
}
