# 08 · 審核機制

## 兩層審核架構

```
使用者送出
   ↓
[第一層: 即時前端驗證] (拒絕明顯錯誤)
   ↓
[第二層: 機器審核 Edge Function] (規則式檢查)
   ↓
[第三層: 人工複審] (管理員看詳情按通過/退回)
   ↓
正式狀態變更
```

## 三類需審核的事項

| 事項 | 第一層 | 第二層 | 第三層 |
|---|---|---|---|
| 新增街貓回報 | 強制照片+位置 | 含貓辨識 | ❌ 不審核 (信任) |
| 接力更新 (換位置/再次目擊) | 強制照片+GPS | 距離 < 2km | ❌ 不審核 |
| 救援申請 | 強制 2 張照片+醫院 | 完整 4 項檢查 | ✅ 必審 |
| 走失家貓 | 強制 1+3 張照片 | (略) | ✅ 必審 (驗證飼主身份) |

**設計原則**: 街貓回報盡量寬鬆 (鼓勵回報、即使少數假回報也不傷大局),救援和走失嚴格審核 (錯誤代價高)。

## 機器審核: 救援申請

### Step 1: 照片時間驗證

```ts
async function checkPhotoTime(photoUrls: string[]): Promise<'pass' | 'warn' | 'fail'> {
  const exifData = await Promise.all(
    photoUrls.map(url => exifr.parse(url))
  );
  
  const timestamps = exifData
    .map(e => e?.DateTimeOriginal || e?.DateTime)
    .filter(Boolean);
  
  // 無 EXIF: warn 進人工
  if (timestamps.length === 0) return 'warn';
  
  // 至少一張在 24h 內: pass
  const oneDayAgo = Date.now() - 24 * 3600 * 1000;
  const hasRecent = timestamps.some(t => new Date(t).getTime() > oneDayAgo);
  
  if (!hasRecent) return 'fail';
  return 'pass';
}
```

### Step 2: 含貓辨識

前端在送出前用 TensorFlow.js MobileNet 跑分類,把結果寫到照片 metadata:

```ts
// src/lib/moderation/cat-detector.ts
import * as mobilenet from '@tensorflow-models/mobilenet';

const CAT_KEYWORDS = [
  'cat', 'kitten', 'tabby', 'persian', 'siamese',
  'egyptian cat', 'tiger cat', 'lynx'
];

let modelCache: mobilenet.MobileNet | null = null;

export async function detectCat(imageFile: File): Promise<{
  hasCat: boolean;
  confidence: number;
  topClasses: string[];
}> {
  if (!modelCache) {
    modelCache = await mobilenet.load();
  }
  
  const img = await loadImage(imageFile);
  const predictions = await modelCache.classify(img, 5);
  
  const topClasses = predictions.map(p => p.className);
  const catMatch = predictions.find(p => 
    CAT_KEYWORDS.some(k => p.className.toLowerCase().includes(k))
  );
  
  return {
    hasCat: !!catMatch && catMatch.probability > 0.3,
    confidence: catMatch?.probability ?? 0,
    topClasses
  };
}
```

後端 Edge Function 信任前端的標記,但偶爾抽樣 (5%) 重跑來監測詐欺:

```ts
// Edge Function: 不能跑 TF.js (太大),改用「抽樣抽查 + 人工」
async function checkHasCat(photos: Photo[]): Promise<'pass' | 'warn'> {
  const allFlagged = photos.every(p => p.metadata?.has_cat === true);
  if (allFlagged) return 'pass';
  return 'warn'; // 前端沒辨識到或被竄改
}
```

### Step 3: 位置合理性

```ts
async function checkLocationSanity(rescueApp): Promise<'pass' | 'warn'> {
  const lastUpdate = await supabase
    .from('report_updates')
    .select('new_location, user_gps_at_action')
    .eq('report_id', rescueApp.report_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  const reportLocation = lastUpdate?.new_location || rescueApp.report.location;
  const userGps = rescueApp.applicant_gps;
  
  if (!userGps) return 'warn'; // 沒有 GPS 資訊
  
  const distance = haversine(reportLocation, userGps);
  
  // > 5km 視為可疑 (可能是 spoofing 或假申請)
  if (distance > 5) return 'warn';
  return 'pass';
}
```

### Step 4: 頻率限制

```ts
async function checkFrequency(userId: string): Promise<'pass' | 'warn' | 'fail'> {
  // 5 分鐘內已送出過 → fail
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { count: recent5min } = await supabase
    .from('rescue_applications')
    .select('*', { count: 'exact', head: true })
    .eq('applied_by', userId)
    .gte('applied_at', fiveMinAgo);
  
  if (recent5min > 0) return 'fail';
  
  // 24 小時內 > 3 筆 → warn (人工複審)
  const oneDayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count: recent24h } = await supabase
    .from('rescue_applications')
    .select('*', { count: 'exact', head: true })
    .eq('applied_by', userId)
    .gte('applied_at', oneDayAgo);
  
  if (recent24h > 3) return 'warn';
  return 'pass';
}
```

### 統整判斷

```ts
function decideStatus(results: Record<string, 'pass' | 'warn' | 'fail'>): {
  status: 'rejected' | 'pending';
  priority: 'high' | 'normal';
} {
  const values = Object.values(results);
  
  if (values.includes('fail')) {
    return { status: 'rejected', priority: 'normal' };
  }
  
  if (values.includes('warn')) {
    return { status: 'pending', priority: 'high' }; // 進高優先佇列
  }
  
  return { status: 'pending', priority: 'normal' };
}
```

## 走失家貓驗證 (純人工)

機器無法判斷「這隻貓真的是這個人的」,必須人工。

**管理員審核時看**:
1. 飼主+貓合照 → 是否真的是同一隻貓?(比對生活照)
2. 生活照 → 是否多角度、不同背景?(避免盜圖)
3. 晶片號碼 → (第二版可串政府晶片資料庫)
4. 飼主帳號歷史 → 是否常用使用者?

**判斷標準**:
- ✅ 通過: 照片合理、無明顯造假跡象
- ⏳ 詢問: 需要更多資訊 (聯絡飼主補資料)
- ❌ 退回: 明顯造假、照片重複/盜用

## 撿到家貓配對 (純機器)

不需審核,直接顯示候選給使用者自行判斷。配對演算法:

```ts
function matchScore(lostCat, foundReport) {
  // 1. 距離分數 (0-1)
  const distanceKm = haversine(lostCat.location, foundReport.location);
  const distanceScore = Math.max(0, 1 - distanceKm / 5);
  
  // 2. 特徵標籤重疊 (Jaccard similarity)
  const lostTagSet = new Set(lostCat.tags);
  const foundTagSet = new Set(foundReport.tags);
  const intersection = [...lostTagSet].filter(t => foundTagSet.has(t)).length;
  const union = new Set([...lostTagSet, ...foundTagSet]).size;
  const tagScore = union > 0 ? intersection / union : 0;
  
  // 3. 時間分數 (越新越好,60 天線性遞減)
  const daysAgo = (Date.now() - new Date(lostCat.created_at).getTime()) / 86400000;
  const recencyScore = Math.max(0, 1 - daysAgo / 60);
  
  // 加權: 距離 40%, 標籤 40%, 時間 20%
  return distanceScore * 0.4 + tagScore * 0.4 + recencyScore * 0.2;
}
```

**呈現邏輯**:
- score >= 0.7: 「高度可能」
- 0.4 <= score < 0.7: 「可能」
- score < 0.4: 「不顯示」

最多顯示 3 隻。

## 檢舉處理

### 自動觸發

```sql
-- 當同一回報被檢舉 3 次以上,自動 hide
create function auto_hide_reported()
returns trigger as $$
begin
  if (select count(*) from abuse_reports where report_id = new.report_id and status = 'pending') >= 3 then
    update reports set 
      status = 'archived',
      updated_at = now()
    where id = new.report_id;
  end if;
  return new;
end;
$$ language plpgsql;
```

### 管理員處理流程

1. 看檢舉列表,以「被檢舉 3 次以上」優先排序
2. 點進詳情看:
   - 被檢舉的內容 (回報、更新、或使用者)
   - 檢舉者的描述
   - 該使用者的歷史紀錄
3. 操作:
   - **撤銷檢舉** (誤檢舉): 還原狀態,不處罰
   - **隱藏回報** (內容違規但帳號保留)
   - **警告使用者** (寄信通知,記錄一次)
   - **停權使用者** (24h / 7d / 永久)

## 人工審核佇列 UI

### 救援申請審核

每筆顯示:

```
┌────────────────────────────────────────────────┐
│ [縮圖] 橘白賓士  · 信義路三段          [高優先級] │
│                                                │
│ 申請人: 小美志工 (累計救援 3 次, 加入 2 個月)  │
│ 救援去向: 大安動物醫院                         │
│ 備註: 受傷需要立刻送醫...                      │
│                                                │
│ 機器審核:                                      │
│ ✓ 照片時間  ✓ 含貓辨識  ⚠ 位置 (距離 6.2km) ✓ 頻率│
│                                                │
│ 照片 (3 張): [縮圖] [縮圖] [縮圖]              │
│                                                │
│ [通過]  [退回 - 理由]  [聯絡申請人]            │
└────────────────────────────────────────────────┘
```

### 走失家貓審核

```
┌────────────────────────────────────────────────┐
│ 申請人: 王太太                                 │
│ 貓名: 咪咪 (三花)                              │
│ 走失地: 信義區永吉路 30 巷                     │
│ 走失情境: 昨天晚上門沒關好,跑出去找不回來      │
│                                                │
│ 飼主+貓合照: [大圖]                           │
│ 生活照 (3 張): [縮圖] [縮圖] [縮圖]            │
│                                                │
│ 晶片號碼: 900xxxxxxxxxxx (使用者填了)          │
│                                                │
│ [通過]  [退回 - 理由]  [詢問補件]              │
└────────────────────────────────────────────────┘
```

## 管理員操作日誌

所有管理員的審核 / 停權 / 刪除動作要記錄:

```sql
create table admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references profiles(id),
  action text not null, -- 'approve_rescue', 'ban_user', 'hide_report', ...
  target_type text,
  target_id uuid,
  details jsonb,
  created_at timestamptz default now()
);
```

## 通知申請人

審核完成後自動發推播 + 站內通知:

```ts
async function notifyRescueResult(rescue: RescueApplication) {
  const message = rescue.status === 'approved'
    ? `你對「${rescue.report.name}」的救援申請已通過 🎉`
    : `你對「${rescue.report.name}」的救援申請被退回:${rescue.review_notes}`;
  
  await supabase.from('notification_queue').insert({
    user_id: rescue.applied_by,
    notification_type: 'rescue_result',
    title: rescue.status === 'approved' ? '救援申請通過' : '救援申請被退回',
    body: message,
    url: `/cat/${rescue.report_id}`,
    data: { rescue_id: rescue.id, status: rescue.status }
  });
}
```

## 審核 SLA (服務水準目標)

- **機器審核**: 即時 (< 5 秒)
- **救援申請人工複審**: 目標 30 分鐘內,最遲 6 小時
- **走失家貓審核**: 目標 1 小時內,最遲 24 小時
- **檢舉處理**: 目標 24 小時內

第一階段只有你一個管理員,實際 SLA 看你能用多少時間。建議:
- 推播通知管理員: 有新申請時手機叫
- 後台介面 mobile-friendly 才能隨時審

## 第一階段審核策略 (僅你一人時)

1. **降低人工負擔**:
   - 機器通過的救援申請,自動公告為「待確認」狀態 (對外顯示「救援中」)
   - 你可以慢慢審,不會卡到使用者

2. **預警機制**:
   - 連續 3 筆來自同一帳號的「位置合理性 warn」→ 自動停權該帳號 24h,進人工複審

3. **批次處理**:
   - 每天集中處理一次或兩次,而不是即時
   - 推播通知聚合 (例如每 4 小時 1 次「有 N 筆待審」)

## 第二階段: 引入志工審核員

當使用量上升,可加入「資深志工」幫忙審。設計:

- 志工等級: 完成 10 次救援、無被檢舉紀錄,可自動晉升「資深志工」
- 資深志工權限: 可審核救援申請 (但不能停權帳號)
- 多人投票機制: 2 個資深志工同意才通過

這是第二版功能,第一版只做 admin/superadmin 兩級。
