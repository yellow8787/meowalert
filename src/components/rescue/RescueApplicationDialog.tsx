"use client";

import { useState } from "react";
import { z } from "zod";
import { Loader2, HeartPulse } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const schema = z.object({
  hospital_name: z.string().min(1, "請填寫救援目的地名稱").max(200),
  contact_phone: z.string().max(20).optional(),
  contact_line: z.string().max(50).optional(),
  message: z.string().max(500).optional(),
});

interface Props {
  catId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RescueApplicationDialog({ catId, open, onOpenChange }: Props) {
  const [hospitalName, setHospitalName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactLine, setContactLine] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function clearErr(field: string) {
    setFieldErrors((p) => { const n = { ...p }; delete n[field]; return n; });
  }

  function validate(): boolean {
    const result = schema.safeParse({
      hospital_name: hospitalName,
      contact_phone: contactPhone || undefined,
      contact_line: contactLine || undefined,
      message: message || undefined,
    });
    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((e) => {
        const field = String(e.path[0] ?? "form");
        if (!errs[field]) errs[field] = e.message;
      });
      setFieldErrors(errs);
      return false;
    }
    setFieldErrors({});
    return true;
  }

  async function handleSubmit() {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/cats/${catId}/rescue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hospital_name: hospitalName.trim(),
          contact_phone: contactPhone.trim() || undefined,
          contact_line: contactLine.trim() || undefined,
          message: message.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "送出失敗，請稍後再試");
      }

      toast.success("救援申請已送出！感謝你的幫助");
      onOpenChange(false);
      setHospitalName("");
      setContactPhone("");
      setContactLine("");
      setMessage("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "發生錯誤，請稍後再試");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-destructive" />
            送出救援申請
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Destination name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              救援目的地
              <span className="text-destructive ml-1">*</span>
            </label>
            <Input
              value={hospitalName}
              onChange={(e) => { setHospitalName(e.target.value); clearErr("hospital_name"); }}
              placeholder="例：台大動物醫院、個人照護、收容所..."
              maxLength={200}
            />
            {fieldErrors.hospital_name && (
              <p className="text-xs text-destructive">{fieldErrors.hospital_name}</p>
            )}
          </div>

          {/* Contact info */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              聯絡方式
              <span className="text-muted-foreground text-xs font-normal ml-1">(選填，方便管理員聯繫)</span>
            </label>
            <Input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="手機號碼"
              maxLength={20}
              type="tel"
            />
            <Input
              value={contactLine}
              onChange={(e) => setContactLine(e.target.value)}
              placeholder="LINE ID"
              maxLength={50}
            />
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              備註
              <span className="text-muted-foreground text-xs font-normal ml-1">(選填)</span>
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="描述貓咪目前狀況或其他補充..."
              maxLength={500}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">{message.length}/500</p>
          </div>

          <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
            送出後管理員將審核你的申請，通過後貓咪狀態將更新為「救援中」。
          </p>

          <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                送出中...
              </>
            ) : (
              "送出救援申請"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
