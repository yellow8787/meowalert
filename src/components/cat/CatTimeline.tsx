"use client";

import { formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export interface TimelineUpdate {
  id: string;
  update_type: string;
  message: string | null;
  created_at: string;
  created_by: string | null;
  created_by_name: string | null;
  created_by_avatar: string | null;
  photos: Array<{ id: string; storage_path: string; display_order: number }>;
}

const UPDATE_CONFIG: Record<string, { icon: string; label: string }> = {
  created: { icon: "🆕", label: "建立了這筆回報" },
  spotted: { icon: "👀", label: "再次目擊" },
  moved: { icon: "📍", label: "更新了位置" },
  rescue_approved: { icon: "🚑", label: "救援已通過審核" },
  rescue_rejected: { icon: "❌", label: "救援申請被退回" },
};

interface Props {
  updates: TimelineUpdate[];
  supabaseUrl: string;
}

function photoUrl(storagePath: string, supabaseUrl: string) {
  return `${supabaseUrl}/storage/v1/object/public/report-photos/${storagePath}`;
}

export function CatTimeline({ updates, supabaseUrl }: Props) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (updates.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        尚無更新記錄
      </div>
    );
  }

  return (
    <>
      <div className="space-y-0">
        {updates.map((update, idx) => {
          const config = UPDATE_CONFIG[update.update_type] ?? {
            icon: "📝",
            label: update.update_type,
          };
          const timeAgo = formatDistanceToNow(new Date(update.created_at), {
            addSuffix: true,
            locale: zhTW,
          });

          return (
            <div key={update.id} className="flex gap-3">
              {/* Timeline connector */}
              <div className="flex flex-col items-center shrink-0">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm">
                  {config.icon}
                </div>
                {idx < updates.length - 1 && (
                  <div className="w-px flex-1 bg-border mt-1 min-h-[1.5rem]" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-5 min-w-0">
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  {/* Avatar */}
                  {update.created_by_avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={update.created_by_avatar}
                      alt=""
                      className="w-5 h-5 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-muted-foreground/20 shrink-0" />
                  )}
                  <span className="text-xs font-medium">
                    {update.created_by_name ?? "匿名"}
                  </span>
                  <span className="text-xs text-muted-foreground">{config.label}</span>
                  <span className="text-xs text-muted-foreground ml-auto shrink-0">
                    {timeAgo}
                  </span>
                </div>

                {update.message && (
                  <p className="text-sm text-muted-foreground mb-2">{update.message}</p>
                )}

                {update.photos.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {update.photos
                      .sort((a, b) => a.display_order - b.display_order)
                      .map((photo) => {
                        const url = photoUrl(photo.storage_path, supabaseUrl);
                        return (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={photo.id}
                            src={url}
                            alt=""
                            className="w-20 h-20 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setLightboxUrl(url)}
                          />
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={(v) => !v && setLightboxUrl(null)}>
        <DialogContent className="max-w-2xl p-1 bg-black border-0">
          {lightboxUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lightboxUrl}
              alt="放大檢視"
              className="w-full h-auto rounded-sm max-h-[80vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
