"use client";

import { useState, useRef } from "react";
import { Camera, ImageIcon, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { compressImage } from "@/lib/image/compress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  onFile: (file: File, dataUrl: string) => void;
  onClear?: () => void;
  className?: string;
}

export function PhotoUpload({ onFile, onClear, className }: Props) {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    const isImage =
      file.type.startsWith("image/") ||
      file.name.toLowerCase().endsWith(".heic") ||
      file.name.toLowerCase().endsWith(".heif");

    if (!isImage) {
      toast.error("請選擇圖片檔案");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error("檔案太大，請選擇 25MB 以下的圖片");
      return;
    }

    setLoading(true);
    try {
      const { file: compressed, dataUrl } = await compressImage(file);
      setPreview(dataUrl);
      onFile(compressed, dataUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      toast.error(msg.toLowerCase().includes("heic") ? "HEIC 轉檔失敗，請改用其他格式" : "圖片處理失敗");
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function clear() {
    setPreview(null);
    onClear?.();
  }

  if (loading) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30 aspect-[4/3] gap-3",
          className
        )}
      >
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">處理中...</p>
      </div>
    );
  }

  if (preview) {
    return (
      <div className={cn("relative rounded-xl overflow-hidden aspect-[4/3] bg-muted", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt="預覽" className="w-full h-full object-cover" />
        <button
          type="button"
          onClick={clear}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          aria-label="移除照片"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="absolute bottom-2 right-2">
          <input ref={galleryRef} type="file" accept="image/*,.heic,.heif" className="hidden" onChange={handleChange} />
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => galleryRef.current?.click()}
          >
            重選
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex gap-2", className)}>
      <input
        ref={galleryRef}
        type="file"
        accept="image/*,.heic,.heif"
        className="hidden"
        onChange={handleChange}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*,.heic,.heif"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
      <Button
        type="button"
        variant="outline"
        className="flex-1 h-24 flex-col gap-2"
        onClick={() => galleryRef.current?.click()}
      >
        <ImageIcon className="h-6 w-6" />
        <span className="text-xs">從相簿選</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        className="flex-1 h-24 flex-col gap-2"
        onClick={() => cameraRef.current?.click()}
      >
        <Camera className="h-6 w-6" />
        <span className="text-xs">拍照</span>
      </Button>
    </div>
  );
}
