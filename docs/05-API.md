# 05 · API 設計

## API 風格

- 使用 Next.js App Router 的 Route Handlers (`app/api/*/route.ts`)
- 大部分讀取直接用 Supabase client (SSR 或 client-side)
- 寫入和複雜邏輯透過 API routes 或 Supabase Edge Functions
- 機器審核、推播觸發用 Edge Functions (Deno runtime)
- 所有 endpoint 回傳 JSON

## 認證

- 透過 Supabase Auth,使用 `@supabase/ssr` 包讓 server 端能取得 session
- 受保護的 endpoint 在 handler 開頭檢查 `auth.getUser()`
- 管理員 endpoint 額外檢查 `profiles.role`

## Endpoint 清單

### 公開 (不需登入)

| Method | Path | 用途 |
|---|---|---|
| GET | `/api/cats` | 取得地圖範圍內的貓咪 (模糊位置) |
| GET | `/api/cats/[id]` | 取得單一貓咪詳情 (精確位置需登入) |
| GET | `/api/cats/[id]/updates` | 取得接力時間軸 |
| GET | `/api/cats/nearby` | 自動擴展搜尋附近需幫助的貓 |
| GET | `/api/hospitals` | 附近動物醫院 (透過 Google Places) |
| GET | `/api/profiles/[id]` | 取得使用者公開資料 |
| GET | `/api/stats/public` | 公開統計 (救援數、地區分布等) |

### 需登入

| Method | Path | 用途 |
|---|---|---|
| POST | `/api/reports/stray` | 新增街貓回報 |
| POST | `/api/reports/lost` | 新增走失家貓 |
| POST | `/api/reports/found` | 新增撿到家貓 |
| POST | `/api/reports/[id]/updates` | 新增接力更新 (換位置/再次目擊) |
| POST | `/api/reports/[id]/rescue` | 送出救援申請 |
| DELETE | `/api/reports/[id]` | 刪除自己的回報 (僅未被接力) |
| GET | `/api/me/profile` | 取得自己完整資料 (含敏感欄位) |
| PATCH | `/api/me/profile` | 更新個人資料 |
| GET | `/api/me/reports` | 我的回報列表 |
| POST | `/api/me/push-subscribe` | 註冊推播訂閱 |
| DELETE | `/api/me/push-subscribe` | 取消推播訂閱 |
| POST | `/api/abuse-reports` | 提交檢舉 |
| POST | `/api/reports/found/match` | 撿到貓自動配對走失貓 |

### 管理員專用

| Method | Path | 用途 |
|---|---|---|
| GET | `/api/admin/rescue-queue` | 救援審核佇列 |
| POST | `/api/admin/rescue/[id]/approve` | 通過救援申請 |
| POST | `/api/admin/rescue/[id]/reject` | 退回救援申請 |
| GET | `/api/admin/lost-queue` | 走失家貓審核佇列 |
| POST | `/api/admin/lost/[id]/approve` | 通過走失家貓 |
| POST | `/api/admin/lost/[id]/reject` | 退回走失家貓 |
| GET | `/api/admin/abuse-queue` | 檢舉處理佇列 |
| POST | `/api/admin/abuse/[id]/resolve` | 處理檢舉 |
| POST | `/api/admin/users/[id]/ban` | 停權使用者 |
| POST | `/api/admin/users/[id]/unban` | 解封 |

### Supabase Edge Functions

| Function | 用途 |
|---|---|
| `moderate-rescue-application` | 機器審核救援申請 |
| `match-found-cat` | 撿到貓配對走失貓 |
| `send-push-notifications` | 處理通知佇列,發送推播 |
| `cron-notify-nearby-urgent` | 定時觸發附近緊急回報通知 |
| `cron-archive-stale` | 定時歸檔過時回報 |

## 詳細規格

### `GET /api/cats`

取得地圖範圍內的貓咪 (用模糊位置)。

**Query params**:
```
bbox: "minLng,minLat,maxLng,maxLat"  // 地圖範圍
status: "need,lost,pending,rescued"  // 逗號分隔,可選
type: "stray,lost,found"             // 可選
limit: 200 (預設, 最大 500)
```

**Response**:
```ts
{
  cats: Array<{
    id: string;
    name: string;
    report_type: 'stray' | 'lost' | 'found';
    status: string;
    tags: string[];
    location_blurred: { lat: number; lng: number };
    thumbnail_url: string | null;
    update_count: number;
    last_activity_at: string;
    created_at: string;
  }>
}
```

### `GET /api/cats/nearby`

自動擴展搜尋。

**Query params**:
```
lat: number (使用者緯度)
lng: number (使用者經度)
limit: 20 (預設)
```

**Response**:
```ts
{
  cats: Array<{
    id: string;
    name: string;
    status: string;
    tags: string[];
    distance_km: number;
    thumbnail_url: string | null;
    description: string;
    update_count: number;
    last_activity_at: string;
  }>,
  search_radius_km: number;
  expanded: boolean;       // 是否超過預設 2.5km
  exhausted: boolean;      // 是否已搜尋到 50km 上限
  district: string | null; // 反向地理編碼出的行政區
  city: string | null;
}
```

### `GET /api/cats/[id]`

**Headers** (optional): `Authorization` (從 Supabase session)

**Response**:
```ts
{
  cat: {
    id: string;
    name: string;
    description: string;
    report_type: 'stray' | 'lost' | 'found';
    status: string;
    tags: string[];
    
    // 位置: 未登入時只給模糊版本
    location: { lat: number; lng: number } | null; // 僅登入可見
    location_blurred: { lat: number; lng: number };
    location_address: string | null;
    
    // 建立者 (公開資料)
    created_by: {
      id: string;
      display_name: string;
      avatar_url: string | null;
      // 聯絡方式只在點「我願意幫忙」時才回傳
    };
    
    // 照片
    photos: Array<{
      id: string;
      url: string;
      taken_at: string | null;
      display_order: number;
    }>;
    
    update_count: number;
    photo_count: number;
    created_at: string;
    last_activity_at: string;
  }
}
```

### `POST /api/reports/stray`

**Body** (multipart/form-data):
```
photo: File (壓縮後的圖片)
name: string
description: string
location_lat: number
location_lng: number
location_method: 'gps' | 'map' | 'address'
location_address: string
tags: string[]  // ['injured', 'trapped', 'kitten', 'maybe_lost']
similar_report_id: string | null  // 若選了「是其中一隻」,這個帶過去
```

**邏輯**:
1. 驗證 user 已登入且未被 ban
2. 驗證 photo (mime type, size)
3. 上傳照片到 Storage
4. 讀取 EXIF (taken_at, gps)
5. 如果有 `similar_report_id`:
   - 不建立新 report,而是 insert 一筆 `report_updates` (type: 'spotted')
   - 回傳該 report id
6. 否則建立新 report:
   - INSERT reports
   - INSERT report_updates (type: 'created')
   - INSERT report_photos (display_order: 0)

**Response**:
```ts
{
  report_id: string;
  is_new: boolean;
  message: string;
}
```

### `POST /api/reports/lost`

**Body** (multipart/form-data):
```
name: string
owner_with_cat_photo: File
lifestyle_photos: File[]  // 至少 3 張
chip_id: string | null
location_lat: number
location_lng: number
location_address: string
lost_context: string
```

**邏輯**:
1. 驗證 user 已登入、有設定聯絡方式
2. 上傳所有照片到 Storage (`verification-photos` bucket)
3. 建立 reports (status: 'lost', report_type: 'lost')
4. 建立 lost_cat_verifications (status: 'pending')
5. 通知管理員

**Response**:
```ts
{
  report_id: string;
  message: string;
}
```

### `POST /api/reports/found`

**Body** (multipart/form-data):
```
photo: File
location_lat: number
location_lng: number
location_address: string
tags: string[]  // ['friendly', 'has_collar', 'clean_fur', 'tnr_clipped']
description: string
current_status: 'on_site' | 'taken_home' | 'sent_to_hospital'
```

**邏輯**:
1. 建立 reports (status: 'found', report_type: 'found')
2. 呼叫 `/api/reports/found/match` 拿到配對結果
3. 對配對到的走失飼主送通知 (queue)

**Response**:
```ts
{
  report_id: string;
  matches: Array<{
    lost_report_id: string;
    name: string;
    distance_km: number;
    match_score: number;
    thumbnail_url: string;
  }>;
}
```

### `POST /api/reports/[id]/updates`

**Body** (multipart/form-data):
```
type: 'moved' | 'spotted'
photo: File
message: string
new_location_lat: number  // 僅 type='moved' 需要
new_location_lng: number
new_location_address: string
user_gps_lat: number
user_gps_lng: number
```

**邏輯**:
1. 驗證 user 已登入
2. 計算 user_gps 與 report 最後位置的距離
3. 若 > 2km → 回 400 with reason
4. 上傳照片
5. INSERT report_updates
6. 若 type='moved' → UPDATE reports.location
7. Queue 通知給 (原回報者 + 接力過的人)

**Response (success)**:
```ts
{
  update_id: string;
}
```

**Response (距離超限)**:
```ts
{
  error: 'distance_exceeded',
  user_distance_km: number,
  max_allowed_km: 2,
  message: '你距離這隻貓 18.3 公里...'
}
```

### `POST /api/reports/[id]/rescue`

**Body** (multipart/form-data):
```
photos: File[]  // 至少 2 張
rescue_destination_type: 'animal_hospital' | 'personal_care' | 'shelter' | 'other'
hospital_id: string | null  // Google Place ID
hospital_name: string
hospital_address: string
notes: string
```

**邏輯**:
1. 驗證 user 已登入
2. 上傳所有照片
3. **呼叫 Edge Function `moderate-rescue-application`** 跑機器審核:
   - 照片時間 (EXIF)
   - 含貓辨識 (在前端跑過了,後端做雙保險)
   - 位置合理性
   - 頻率限制
4. 若有任一 fail → 回 400 with reasons
5. INSERT rescue_applications (status: 'pending')
6. UPDATE reports.status = 'pending'
7. 通知管理員人工複審

**Response**:
```ts
{
  rescue_id: string;
  auto_review_results: Record<string, 'pass' | 'warn' | 'fail'>;
  status: 'pending';
}
```

### `GET /api/hospitals`

**Query params**:
```
lat: number
lng: number
radius_m: 3000 (預設, 最大 10000)
keyword: 'open_now' | '24h' | 'high_rated' | null
sort: 'relevance' | 'rating' | 'distance' (預設 relevance)
```

**邏輯**:
1. 呼叫 Google Places API (Nearby Search)
   - 用 3 個 keyword 查: '獸醫', '貓咪醫院', '動物醫院'
   - 限制 type 為 `veterinary_care`
2. 合併去重 (用 place_id)
3. 套用 keyword filter
4. 套用排序
5. 快取 (Redis 或 Edge 快取) 1 小時

**Response**:
```ts
{
  hospitals: Array<{
    place_id: string;
    name: string;
    address: string;
    location: { lat: number; lng: number };
    distance_m: number;
    rating: number | null;
    user_ratings_total: number;
    opening_hours: {
      open_now: boolean;
      weekday_text: string[];
    } | null;
    is_24h: boolean;
    phone: string | null;
    google_maps_url: string;
  }>
}
```

### `GET /api/me/profile`

**Response**:
```ts
{
  id: string;
  email: string;  // 只有自己看得到
  display_name: string;
  avatar_url: string | null;
  line_id: string | null;
  messenger_url: string | null;
  
  notification_enabled: boolean;
  notify_my_reports: boolean;
  notify_nearby_urgent: boolean;
  notify_nearby_radius_km: number;
  // ...其他通知設定
  
  role: 'user' | 'admin' | 'superadmin';
  
  stats: {
    report_count: number;
    rescue_count: number;
    relay_count: number;
  };
  
  has_contact_method: boolean;  // 是否有填 LINE/Messenger
}
```

### `PATCH /api/me/profile`

**Body**:
```ts
{
  display_name?: string;
  line_id?: string;
  messenger_url?: string;
  notification_enabled?: boolean;
  notify_my_reports?: boolean;
  notify_nearby_urgent?: boolean;
  notify_nearby_radius_km?: number;  // 1-50
  // ...
}
```

### `POST /api/abuse-reports`

**Body**:
```ts
{
  target_type: 'report' | 'update' | 'user';
  target_id: string;
  reason: 'fake_report' | 'wrong_location' | 'harassment' | 'inappropriate_photo' | 'spam' | 'other';
  description: string;
}
```

### `POST /api/me/push-subscribe`

**Body** (Web Push Subscription 物件):
```ts
{
  endpoint: string;
  keys: { p256dh: string; auth: string };
  device_label?: string;
}
```

### 管理員: `GET /api/admin/rescue-queue`

**Response**:
```ts
{
  applications: Array<{
    id: string;
    report: {
      id: string;
      name: string;
      thumbnail_url: string;
    };
    applicant: {
      id: string;
      display_name: string;
      avatar_url: string | null;
      total_rescue_count: number;
    };
    auto_review_results: Record<string, 'pass' | 'warn'>;
    photos: Array<{ url: string; taken_at: string }>;
    rescue_destination_type: string;
    hospital_name: string;
    notes: string;
    applied_at: string;
    priority: 'high' | 'normal';  // 含 warn 的優先
  }>
}
```

### 管理員: `POST /api/admin/rescue/[id]/approve`

**Body**:
```ts
{
  notes?: string;
}
```

**邏輯**:
1. UPDATE rescue_applications.status = 'approved'
2. UPDATE reports.status = 'rescued'
3. INSERT report_updates (type: 'rescue_approved')
4. Queue 通知申請者

### Supabase Edge Function: `moderate-rescue-application`

```ts
// supabase/functions/moderate-rescue-application/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import exifr from "https://esm.sh/exifr@7.1.3";

serve(async (req) => {
  const { rescue_id } = await req.json();
  
  const supabase = createClient(/* env */);
  
  // 取得 rescue + photos + report
  const { data: rescue } = await supabase
    .from('rescue_applications')
    .select('*, reports(*), report_photos(*)')
    .eq('id', rescue_id)
    .single();
  
  const results: Record<string, 'pass' | 'warn' | 'fail'> = {};
  
  // Step 1: 照片時間
  for (const photo of rescue.report_photos) {
    const exif = await exifr.parse(photo.url);
    const takenAt = exif?.DateTimeOriginal || exif?.DateTime;
    if (!takenAt) {
      results.photo_time = 'warn';
      continue;
    }
    const hoursAgo = (Date.now() - new Date(takenAt).getTime()) / 1000 / 3600;
    if (hoursAgo > 24) {
      results.photo_time = 'fail';
      break;
    }
  }
  results.photo_time ??= 'pass';
  
  // Step 2: 含貓辨識 (前端已跑過,後端從 photo metadata 確認 flag)
  // (前端用 TensorFlow.js 跑完後,把 has_cat: true 寫到 photo metadata)
  results.has_cat = rescue.report_photos.every(p => p.has_cat) ? 'pass' : 'warn';
  
  // Step 3: 位置合理性
  const lastUpdate = /* query latest update for report */;
  const distance = haversine(rescue.reports.location, lastUpdate.new_location ?? rescue.reports.location);
  if (distance > 5) results.location = 'warn';
  else results.location = 'pass';
  
  // Step 4: 頻率
  const recentRescues = await supabase
    .from('rescue_applications')
    .select('id')
    .eq('applied_by', rescue.applied_by)
    .gte('applied_at', new Date(Date.now() - 24 * 3600 * 1000));
  
  if (recentRescues.data.length > 3) results.frequency = 'warn';
  else if (recentRescues.data.length > 1 /* in 5 min */) results.frequency = 'fail';
  else results.frequency = 'pass';
  
  // 統整
  const anyFail = Object.values(results).includes('fail');
  
  await supabase
    .from('rescue_applications')
    .update({
      auto_review_results: results,
      auto_review_passed: !anyFail,
      auto_reviewed_at: new Date().toISOString(),
      status: anyFail ? 'rejected' : 'pending'
    })
    .eq('id', rescue_id);
  
  return new Response(JSON.stringify(results), { 
    headers: { 'Content-Type': 'application/json' } 
  });
});
```

### Supabase Edge Function: `match-found-cat`

實作見 `04-DATABASE.md` 的 SQL 查詢。

### Supabase Edge Function: `send-push-notifications`

```ts
// 定時跑 (每分鐘 或 由 trigger)
// 從 notification_queue 抓 status='pending' 的
// 對每個 user 找 push_subscriptions
// 用 web-push lib 發送
// 更新 status='sent' 或 'failed'
```

## Rate Limiting

在 Edge Function 或 Next.js middleware 實作:

| Endpoint | 限制 |
|---|---|
| POST `/api/reports/*` | 5 次 / 10 分鐘 / user |
| POST `/api/reports/[id]/updates` | 10 次 / 10 分鐘 / user |
| POST `/api/reports/[id]/rescue` | 3 次 / 24 小時 / user (機器審核會擋更緊) |
| GET `/api/hospitals` | 30 次 / 分鐘 / user (快取 1 小時) |
| GET `/api/cats/nearby` | 60 次 / 分鐘 / user |

## Error Format

```ts
{
  error: string;          // 機器可讀的代碼,例如 'distance_exceeded'
  message: string;        // 人類可讀訊息
  details?: object;       // 額外資訊
}
```

## Status Codes

- 200: OK
- 201: Created
- 400: Bad Request (驗證失敗、距離超限等)
- 401: Unauthorized (未登入)
- 403: Forbidden (權限不足、被 ban)
- 404: Not Found
- 409: Conflict (重複資源)
- 429: Too Many Requests (rate limit)
- 500: Internal Server Error
