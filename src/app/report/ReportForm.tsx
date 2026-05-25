"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { AlertTriangle, Eye, HeartCrack, Home, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BackHeader } from "@/components/layout/BackHeader";
import { PhotoUpload } from "@/components/form/PhotoUpload";
import { LocationInput, type LocationValue } from "@/components/form/LocationInput";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ReportTypeId = "stray_urgent" | "stray_watch" | "lost" | "found";

const REPORT_TYPES = [
  {
    id: "stray_urgent" as const,
    icon: AlertTriangle,
    title: "緊急救援",
    subtitle: "受傷、卡困或危急",
    activeClass: "border-red-500 bg-red-50",
    iconClass: "text-red-600",
    textClass: "text-red-600",
  },
  {
    id: "stray_watch" as const,
    icon: Eye,
    title: "需要關注",
    subtitle: "流浪街貓，目前安全",
    activeClass: "border-orange-400 bg-orange-50",
    iconClass: "text-orange-500",
    textClass: "text-orange-500",
  },
  {
    id: "lost" as const,
    icon: HeartCrack,
    title: "走失家貓",
    subtitle: "我的家貓不見了",
    activeClass: "border-purple-500 bg-purple-50",
    iconClass: "text-purple-600",
    textClass: "text-purple-600",
  },
  {
    id: "found" as const,
    icon: Home,
    title: "撿到家貓",
    subtitle: "撿到一隻像家貓的貓",
    activeClass: "border-green-500 bg-green-50",
    iconClass: "text-green-600",
    textClass: "text-green-600",
  },
] as const;

const TAGS = [
  { value: "injured", label: "受傷" },
  { value: "trapped", label: "卡困" },
  { value: "kitten", label: "幼貓" },
  { value: "maybe_lost", label: "疑似走失" },
];

const TYPE_TO_DB: Record<ReportTypeId, { report_type: string; status: string }> = {
  stray_urgent: { report_type: "stray", status: "need" },
  stray_watch: { report_type: "stray", status: "need" },
  lost: { report_type: "lost", status: "lost" },
  found: { report_type: "found", status: "found" },
};

function nowDatetimeLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

const baseSchema = z.object({
  photo: z.instanceof(File, { message: "請上傳照片" }),
  location: z
    .object({ lat: z.number(), lng: z.number(), address: z.string() })
    .nullable()
    .refine((v): v is LocationValue => v !== null, { message: "請設定位置" }),
  name: z.string().min(1, "請輸入名字").max(20, "名字不能超過 20 字"),
  description: z.string().max(500, "描述不能超過 500 字").optional(),
});

const lostSchema = baseSchema.extend({
  owner_contact_phone: z.string().min(1, "請填寫飼主聯絡電話"),
});

const foundSchema = baseSchema;

export function ReportForm() {
  const router = useRouter();

  const [reportType, setReportType] = useState<ReportTypeId>("stray_urgent");
  const [photo, setPhoto] = useState<File | null>(null);
  const [location, setLocation] = useState<LocationValue | null>(null);
  const [name, setName] = useState("街貓");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // 走失家貓欄位
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerLine, setOwnerLine] = useState("");
  const [ownerOther, setOwnerOther] = useState("");
  const [lostAt, setLostAt] = useState(nowDatetimeLocal());
  const [lastSeenAddress, setLastSeenAddress] = useState("");

  // 撿到街貓欄位
  const [temporaryCare, setTemporaryCare] = useState(false);
  const [temporaryCareUntil, setTemporaryCareUntil] = useState("");

  const isStray = reportType === "stray_urgent" || reportType === "stray_watch";
  const isLost = reportType === "lost";
  const isFound = reportType === "found";

  const isDirty =
    !!photo ||
    !!location ||
    !!description ||
    tags.length > 0 ||
    name !== "街貓" ||
    !!ownerPhone;

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (isDirty && !submitting) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty, submitting]);

  // Reset name default when switching type
  useEffect(() => {
    if (isStray) setName((n) => (n === "家貓" ? "街貓" : n));
    else if (isLost || isFound) setName((n) => (n === "街貓" ? "家貓" : n));
  }, [isStray, isLost, isFound]);

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function clearError(field: string) {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function validate(): boolean {
    const schema = isLost ? lostSchema : foundSchema;
    const result = schema.safeParse({
      photo,
      location,
      name,
      description,
      owner_contact_phone: ownerPhone,
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
    if (!validate()) {
      toast.error("請填寫所有必填欄位");
      return;
    }

    setSubmitting(true);
    const toastId = toast.loading("建立回報中...");

    try {
      const { report_type, status } = TYPE_TO_DB[reportType];

      const formData = new FormData();
      formData.set("report_type", report_type);
      formData.set("status", status);
      formData.set("photo", photo!);
      formData.set("location_lat", location!.lat.toString());
      formData.set("location_lng", location!.lng.toString());
      formData.set("location_address", location!.address);
      formData.set("name", name.trim() || (isStray ? "街貓" : "家貓"));
      if (description.trim()) formData.set("description", description.trim());
      if (tags.length > 0) formData.set("tags", JSON.stringify(tags));

      if (isLost) {
        formData.set("owner_contact_phone", ownerPhone.trim());
        if (ownerLine.trim()) formData.set("owner_contact_line", ownerLine.trim());
        if (ownerOther.trim()) formData.set("owner_contact_other", ownerOther.trim());
        if (lostAt) formData.set("lost_at", new Date(lostAt).toISOString());
        if (lastSeenAddress.trim()) formData.set("last_seen_address", lastSeenAddress.trim());
      }

      if (isFound) {
        formData.set("temporary_care", temporaryCare ? "true" : "false");
        if (temporaryCare && temporaryCareUntil)
          formData.set("temporary_care_until", temporaryCareUntil);
      }

      const res = await fetch("/api/cats", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "回報失敗，請稍後再試");
      }

      toast.success("回報成功！感謝你的幫助 🐱", { id: toastId });
      router.push(`/cat/${data.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "發生錯誤，請稍後再試", {
        id: toastId,
      });
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col min-h-[calc(100dvh-4rem)]">
      <BackHeader title="新增回報" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* 類型選擇 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            類型 <span className="text-destructive">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {REPORT_TYPES.map(
              ({ id, icon: Icon, title, subtitle, activeClass, iconClass, textClass }) => {
                const isActive = reportType === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setReportType(id)}
                    className={cn(
                      "flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all",
                      isActive
                        ? activeClass
                        : "border-border bg-card hover:border-muted-foreground/30"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-5 w-5 mb-1.5",
                        isActive ? iconClass : "text-muted-foreground"
                      )}
                    />
                    <span
                      className={cn(
                        "font-semibold text-sm",
                        isActive ? textClass : "text-foreground"
                      )}
                    >
                      {title}
                    </span>
                    <span className="text-xs text-muted-foreground mt-0.5">{subtitle}</span>
                  </button>
                );
              }
            )}
          </div>
        </div>

        {/* 照片 */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            照片 <span className="text-destructive">*</span>
          </label>
          <PhotoUpload
            onFile={(file) => { setPhoto(file); clearError("photo"); }}
            onClear={() => setPhoto(null)}
          />
          {fieldErrors.photo && (
            <p className="text-xs text-destructive">{fieldErrors.photo}</p>
          )}
        </div>

        {/* 位置 */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            {isLost ? "走失地點" : isFound ? "撿到地點" : "位置"}{" "}
            <span className="text-destructive">*</span>
          </label>
          <LocationInput
            value={location}
            onChange={(loc) => { setLocation(loc); clearError("location"); }}
          />
          {fieldErrors.location && (
            <p className="text-xs text-destructive">{fieldErrors.location}</p>
          )}
        </div>

        {/* 名字 */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            暱稱 <span className="text-destructive">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => { setName(e.target.value); clearError("name"); }}
            placeholder={isStray ? "街貓" : "家貓"}
            maxLength={20}
          />
          {fieldErrors.name && (
            <p className="text-xs text-destructive">{fieldErrors.name}</p>
          )}
        </div>

        {/* 描述 */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            {isLost ? "貓咪特徵描述" : "描述"}{" "}
            <span className="text-muted-foreground text-xs font-normal">(選填)</span>
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              isLost
                ? "毛色、體型、特徵、走失前的行為..."
                : isFound
                ? "撿到的狀況、貓咪外觀特徵..."
                : "描述你看到的狀況、特徵、位置細節..."
            }
            maxLength={500}
            rows={3}
          />
          <p className="text-xs text-muted-foreground text-right">
            {description.length}/500
          </p>
        </div>

        {/* 街貓標籤 */}
        {isStray && (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              標籤{" "}
              <span className="text-muted-foreground text-xs font-normal">(選填，可多選)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {TAGS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleTag(value)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm border transition-all",
                    tags.includes(value)
                      ? "bg-destructive/10 text-destructive border-destructive/30 font-medium"
                      : "border-border text-muted-foreground hover:border-muted-foreground/50"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── 走失家貓專用欄位 ── */}
        {isLost && (
          <div className="space-y-4 rounded-xl border border-purple-200 bg-purple-50/50 p-4">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
              <p className="text-xs text-purple-700">
                飼主聯絡方式會公開顯示，讓看到貓咪的人能直接聯絡你。
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                飼主聯絡電話 <span className="text-destructive">*</span>
              </label>
              <Input
                value={ownerPhone}
                onChange={(e) => { setOwnerPhone(e.target.value); clearError("owner_contact_phone"); }}
                placeholder="0912-345-678"
                type="tel"
                maxLength={20}
              />
              {fieldErrors.owner_contact_phone && (
                <p className="text-xs text-destructive">{fieldErrors.owner_contact_phone}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                LINE ID{" "}
                <span className="text-muted-foreground text-xs font-normal">(選填)</span>
              </label>
              <Input
                value={ownerLine}
                onChange={(e) => setOwnerLine(e.target.value)}
                placeholder="your_line_id"
                maxLength={50}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                其他聯絡方式{" "}
                <span className="text-muted-foreground text-xs font-normal">(選填)</span>
              </label>
              <Input
                value={ownerOther}
                onChange={(e) => setOwnerOther(e.target.value)}
                placeholder="Facebook、Instagram、Email..."
                maxLength={100}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                走失時間{" "}
                <span className="text-muted-foreground text-xs font-normal">(選填)</span>
              </label>
              <input
                type="datetime-local"
                value={lostAt}
                onChange={(e) => setLostAt(e.target.value)}
                max={nowDatetimeLocal()}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                最後出沒地點{" "}
                <span className="text-muted-foreground text-xs font-normal">(選填)</span>
              </label>
              <Input
                value={lastSeenAddress}
                onChange={(e) => setLastSeenAddress(e.target.value)}
                placeholder="例：大安森林公園附近、台大校園..."
                maxLength={200}
              />
            </div>
          </div>
        )}

        {/* ── 撿到街貓專用欄位 ── */}
        {isFound && (
          <div className="space-y-4 rounded-xl border border-green-200 bg-green-50/50 p-4">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
              <p className="text-xs text-green-700">
                飼主看到後可以透過這裡聯絡你認領。
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">是否暫時照護中？</label>
              <div className="flex gap-2">
                {[
                  { value: true, label: "是，我暫時照顧中" },
                  { value: false, label: "否，貓咪在外面" },
                ].map(({ value, label }) => (
                  <button
                    key={String(value)}
                    type="button"
                    onClick={() => setTemporaryCare(value)}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all",
                      temporaryCare === value
                        ? "border-green-500 bg-green-100 text-green-700"
                        : "border-border text-muted-foreground hover:border-muted-foreground/50"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {temporaryCare && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  暫養到何時{" "}
                  <span className="text-muted-foreground text-xs font-normal">(選填)</span>
                </label>
                <input
                  type="date"
                  value={temporaryCareUntil}
                  onChange={(e) => setTemporaryCareUntil(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 送出 */}
      <div className="px-4 py-4 border-t bg-background">
        <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              送出中...
            </>
          ) : (
            "送出回報"
          )}
        </Button>
      </div>
    </div>
  );
}
