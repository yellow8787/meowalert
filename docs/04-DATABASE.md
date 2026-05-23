# 04 · 資料庫設計 (Supabase PostgreSQL)

## ER 概念圖

```
auth.users (Supabase 內建)
   ↓ 1:1
profiles                    ← 公開個人資料、聯絡方式、設定
   ↓ 1:N
reports                     ← 一筆回報 = 一隻貓的紀錄
   ↓ 1:N
report_updates              ← 接力更新時間軸
   ↓ N:1
report_photos               ← 每筆 update 對應 1-N 張照片

rescue_applications         ← 救援申請 (對應到某個 report)
   ↓
lost_cat_verifications      ← 走失家貓的飼主驗證資料
abuse_reports               ← 檢舉紀錄
push_subscriptions          ← 推播訂閱 (一個 user 可有多裝置)
```

## 完整 Schema

### `profiles` - 使用者公開資料

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  
  -- 聯絡方式
  line_id text,
  messenger_url text,
  
  -- 個人統計 (用 view 算更新,但快取在這裡優化讀取)
  report_count integer default 0,
  rescue_count integer default 0,
  relay_count integer default 0,
  
  -- 通知設定
  notification_enabled boolean default true,
  notify_my_reports boolean default true,
  notify_nearby_urgent boolean default true,
  notify_nearby_radius_km integer default 3 check (notify_nearby_radius_km between 1 and 50),
  notify_rescue_result boolean default true,
  notify_lost_cat_result boolean default true,
  notify_found_cat_match boolean default true,
  notify_my_lost_cat_spotted boolean default true,
  
  -- 角色
  role text default 'user' check (role in ('user', 'admin', 'superadmin')),
  
  -- 狀態
  is_banned boolean default false,
  banned_at timestamptz,
  banned_reason text,
  
  -- 預設位置 (使用者家)
  home_location geography(point, 4326),
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_profiles_role on profiles(role) where role != 'user';
create index idx_profiles_banned on profiles(is_banned) where is_banned = true;
```

### `reports` - 貓咪回報主表

```sql
create table reports (
  id uuid primary key default gen_random_uuid(),
  
  -- 基本資訊
  report_type text not null check (report_type in ('stray', 'lost', 'found')),
  name text not null,
  description text,
  
  -- 狀態 (受 update 影響,但在這裡 cache 最新值方便查詢)
  status text not null default 'need' check (status in (
    'need',       -- 緊急救援 (stray)
    'pending',    -- 救援中 (待審核)
    'rescued',    -- 已救援
    'lost',       -- 走失家貓
    'found',      -- 撿到家貓
    'reunited',   -- 已團圓 (走失家貓找到了)
    'archived'    -- 已歸檔 (60 天無更新自動隱藏)
  )),
  
  -- 子標籤 (stray 才用)
  tags text[] default '{}', -- ['injured', 'trapped', 'kitten', 'maybe_lost']
  
  -- 位置 (精確,只給登入使用者看)
  location geography(point, 4326) not null,
  location_address text, -- 人類可讀地址 (反向地理編碼)
  location_district text, -- 行政區 (例: 大安區)
  location_city text, -- 城市 (例: 台北市)
  
  -- 位置模糊化版本 (公開地圖用)
  -- 將精確座標四捨五入到約 100m 精度
  location_blurred geography(point, 4326) not null,
  
  -- 建立者
  created_by uuid not null references profiles(id) on delete restrict,
  
  -- 時間
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_activity_at timestamptz default now(), -- 用來排序 / 自動歸檔
  
  -- 計數 (cache 用)
  update_count integer default 1,
  photo_count integer default 0,
  
  -- 軟刪除 (僅未被接力的可刪)
  deleted_at timestamptz
);

create index idx_reports_status on reports(status) where deleted_at is null;
create index idx_reports_type on reports(report_type) where deleted_at is null;
create index idx_reports_location on reports using gist(location);
create index idx_reports_location_blurred on reports using gist(location_blurred);
create index idx_reports_last_activity on reports(last_activity_at desc);
create index idx_reports_created_by on reports(created_by);
```

### `report_updates` - 接力更新時間軸

```sql
create table report_updates (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  
  -- 更新類型
  update_type text not null check (update_type in (
    'created',         -- 初次建立 (對應第一筆 update)
    'moved',           -- 換位置
    'spotted',         -- 再次目擊
    'rescue_applied',  -- 送出救援申請
    'rescue_approved', -- 救援申請通過
    'rescue_rejected', -- 救援申請退回
    'reunited',        -- 走失家貓找到了
    'admin_note'       -- 管理員備註
  )),
  
  -- 內容
  message text,
  
  -- 新位置 (若是 moved)
  new_location geography(point, 4326),
  new_location_address text,
  
  -- 操作者
  created_by uuid references profiles(id) on delete set null,
  
  -- 時間
  created_at timestamptz default now(),
  
  -- 距離限制檢查時記錄使用者當時 GPS 位置 (反詐用)
  user_gps_at_action geography(point, 4326)
);

create index idx_updates_report on report_updates(report_id, created_at desc);
create index idx_updates_user on report_updates(created_by);
```

### `report_photos` - 照片

```sql
create table report_photos (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  update_id uuid references report_updates(id) on delete cascade, -- 哪次更新時上傳的
  
  -- 儲存路徑 (Supabase Storage bucket: report-photos)
  storage_path text not null,
  
  -- 元資料
  width integer,
  height integer,
  size_bytes integer,
  
  -- EXIF
  taken_at timestamptz, -- 從 EXIF 讀
  exif_gps geography(point, 4326), -- 若 EXIF 含 GPS
  
  -- 排序 (第一張會當縮圖)
  display_order integer default 0,
  
  -- 上傳者
  uploaded_by uuid references profiles(id) on delete set null,
  uploaded_at timestamptz default now()
);

create index idx_photos_report on report_photos(report_id, display_order);
```

### `rescue_applications` - 救援申請

```sql
create table rescue_applications (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  
  -- 申請內容
  rescue_destination_type text not null check (rescue_destination_type in (
    'animal_hospital',
    'personal_care',
    'shelter',
    'other'
  )),
  hospital_id text, -- Google Place ID (如果是 animal_hospital)
  hospital_name text not null,
  hospital_address text,
  notes text,
  
  -- 申請者
  applied_by uuid not null references profiles(id) on delete restrict,
  applied_at timestamptz default now(),
  
  -- 機器審核結果
  auto_review_passed boolean,
  auto_review_results jsonb, -- {photo_time: 'pass', has_cat: 'pass', location: 'warn', frequency: 'pass'}
  auto_reviewed_at timestamptz,
  
  -- 人工審核
  status text not null default 'pending' check (status in (
    'pending',         -- 等待管理員審核
    'approved',        -- 通過
    'rejected'         -- 退回
  )),
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text
);

create index idx_rescue_status on rescue_applications(status) where status = 'pending';
create index idx_rescue_report on rescue_applications(report_id);
```

### `lost_cat_verifications` - 走失家貓飼主驗證

```sql
create table lost_cat_verifications (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references reports(id) on delete cascade,
  
  -- 驗證資料
  owner_with_cat_photo_path text not null, -- 飼主+貓合照
  lifestyle_photo_paths text[] not null,    -- 生活照 (至少 3 張)
  chip_id text,                              -- 晶片號碼 (選填)
  lost_context text,                         -- 走失情境描述
  
  -- 驗證狀態
  status text not null default 'pending' check (status in (
    'pending', 'approved', 'rejected'
  )),
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  
  -- 飼主
  owner_id uuid not null references profiles(id) on delete restrict,
  
  created_at timestamptz default now()
);

create index idx_lost_verif_status on lost_cat_verifications(status) where status = 'pending';
```

### `abuse_reports` - 檢舉紀錄

```sql
create table abuse_reports (
  id uuid primary key default gen_random_uuid(),
  
  -- 被檢舉對象 (可選一個)
  report_id uuid references reports(id) on delete cascade,
  update_id uuid references report_updates(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  
  -- 檢舉內容
  reason text not null check (reason in (
    'fake_report',         -- 假回報
    'wrong_location',      -- 位置不對
    'harassment',          -- 騷擾行為
    'inappropriate_photo', -- 不當照片
    'spam',                -- 灌水
    'other'
  )),
  description text,
  
  -- 檢舉者
  reported_by uuid not null references profiles(id) on delete restrict,
  reported_at timestamptz default now(),
  
  -- 處理
  status text not null default 'pending' check (status in (
    'pending', 'resolved', 'dismissed'
  )),
  resolved_by uuid references profiles(id) on delete set null,
  resolved_at timestamptz,
  resolution_notes text
);

create index idx_abuse_status on abuse_reports(status) where status = 'pending';
```

### `push_subscriptions` - 推播訂閱

```sql
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  
  -- Web Push 訂閱資料
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  
  -- 裝置識別
  user_agent text,
  device_label text, -- 使用者可命名 "我的 iPhone" 等
  
  created_at timestamptz default now(),
  last_used_at timestamptz default now()
);

create index idx_push_user on push_subscriptions(user_id);
```

### `notification_queue` - 通知佇列 (Edge Function 處理)

```sql
create table notification_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  
  notification_type text not null check (notification_type in (
    'my_report_updated',
    'nearby_urgent',
    'rescue_result',
    'lost_cat_result',
    'found_cat_match',
    'my_lost_cat_spotted',
    'system_announcement'
  )),
  
  title text not null,
  body text not null,
  url text not null, -- 點通知開啟的路徑
  data jsonb,        -- 額外資料
  
  status text default 'pending' check (status in ('pending', 'sent', 'failed')),
  scheduled_at timestamptz default now(),
  sent_at timestamptz,
  error text,
  
  created_at timestamptz default now()
);

create index idx_notify_pending on notification_queue(status, scheduled_at) where status = 'pending';
```

## Row Level Security (RLS) 政策

### `profiles`

```sql
alter table profiles enable row level security;

-- 任何人可看 (但會在 query 層只 select 公開欄位)
create policy "profiles_public_read" on profiles
  for select using (true);

-- 只能改自己的
create policy "profiles_self_update" on profiles
  for update using (auth.uid() = id);

-- 註冊時自動建立 (透過 trigger)
create policy "profiles_self_insert" on profiles
  for insert with check (auth.uid() = id);
```

### `reports`

```sql
alter table reports enable row level security;

-- 任何人可看 (未刪除的)
create policy "reports_public_read" on reports
  for select using (deleted_at is null);

-- 登入者可建立
create policy "reports_authenticated_insert" on reports
  for insert with check (auth.uid() = created_by);

-- 自己的可改 (但只能改特定欄位,用 trigger 限制)
create policy "reports_self_update" on reports
  for update using (auth.uid() = created_by);

-- 管理員可改任何
create policy "reports_admin_update" on reports
  for update using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'superadmin'))
  );
```

### `report_updates`

```sql
alter table report_updates enable row level security;

create policy "updates_public_read" on report_updates for select using (true);

-- 登入者可建立 (但距離限制在 Edge Function 檢查)
create policy "updates_authenticated_insert" on report_updates
  for insert with check (auth.uid() = created_by);
```

### `report_photos`

```sql
alter table report_photos enable row level security;

create policy "photos_public_read" on report_photos for select using (true);
create policy "photos_authenticated_insert" on report_photos
  for insert with check (auth.uid() = uploaded_by);
```

### `rescue_applications`

```sql
alter table rescue_applications enable row level security;

-- 任何人可看 status (但敏感欄位用 view 過濾)
create policy "rescue_public_read" on rescue_applications for select using (true);

create policy "rescue_authenticated_insert" on rescue_applications
  for insert with check (auth.uid() = applied_by);

-- 只有管理員可改
create policy "rescue_admin_update" on rescue_applications
  for update using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'superadmin'))
  );
```

### `lost_cat_verifications`

```sql
alter table lost_cat_verifications enable row level security;

-- 只有飼主自己和管理員可看 (含敏感資料)
create policy "verif_owner_read" on lost_cat_verifications
  for select using (auth.uid() = owner_id);

create policy "verif_admin_read" on lost_cat_verifications
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'superadmin'))
  );

create policy "verif_owner_insert" on lost_cat_verifications
  for insert with check (auth.uid() = owner_id);
```

### `abuse_reports`

```sql
alter table abuse_reports enable row level security;

-- 檢舉者和管理員可看
create policy "abuse_self_read" on abuse_reports
  for select using (auth.uid() = reported_by);

create policy "abuse_admin_read" on abuse_reports
  for select using (
    exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'superadmin'))
  );

create policy "abuse_authenticated_insert" on abuse_reports
  for insert with check (auth.uid() = reported_by);
```

### `push_subscriptions`, `notification_queue`

```sql
-- 只能存取自己的
alter table push_subscriptions enable row level security;
create policy "push_self" on push_subscriptions
  for all using (auth.uid() = user_id);

alter table notification_queue enable row level security;
create policy "notify_self_read" on notification_queue
  for select using (auth.uid() = user_id);
```

## Triggers

### 註冊時自動建立 profile

```sql
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', '貓貓朋友'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

### 模糊化位置

```sql
create function blur_location(loc geography)
returns geography as $$
begin
  -- 將座標四捨五入到約 100m (緯度 0.001 度 ≈ 111m)
  return st_setsrid(st_makepoint(
    round(st_x(loc::geometry)::numeric, 3)::float,
    round(st_y(loc::geometry)::numeric, 3)::float
  ), 4326)::geography;
end;
$$ language plpgsql immutable;

create function set_blurred_location()
returns trigger as $$
begin
  new.location_blurred := blur_location(new.location);
  return new;
end;
$$ language plpgsql;

create trigger reports_blur_location
  before insert or update of location on reports
  for each row execute function set_blurred_location();
```

### 更新 last_activity_at, update_count

```sql
create function update_report_on_new_update()
returns trigger as $$
begin
  update reports set
    last_activity_at = now(),
    update_count = update_count + 1
  where id = new.report_id;
  return new;
end;
$$ language plpgsql;

create trigger after_update_insert
  after insert on report_updates
  for each row execute function update_report_on_new_update();
```

### 自動歸檔 (走失家貓 60 天無更新)

```sql
-- 用 Supabase 的 pg_cron extension 每日跑
create or replace function auto_archive_stale_reports()
returns void as $$
begin
  update reports set
    status = 'archived',
    updated_at = now()
  where status in ('lost', 'need')
    and last_activity_at < now() - interval '60 days'
    and deleted_at is null;
end;
$$ language plpgsql;

-- 設定排程 (Supabase Dashboard > Database > Extensions > pg_cron)
-- select cron.schedule('archive-stale', '0 2 * * *', 'select auto_archive_stale_reports();');
```

### 統計快取更新

```sql
create function update_user_stats()
returns trigger as $$
begin
  -- 增加建立者的 report_count
  if tg_op = 'INSERT' then
    update profiles set report_count = report_count + 1
    where id = new.created_by;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger reports_update_stats
  after insert on reports
  for each row execute function update_user_stats();

-- 類似的觸發器用於 rescue_count, relay_count
```

## Storage Buckets

### `report-photos`

```sql
-- Bucket: report-photos
-- Public: true (照片公開可看,因為要在地圖上顯示)
-- File size limit: 1 MB (已壓縮)
-- Allowed MIME types: image/jpeg, image/webp

-- Path 結構:
-- reports/{report_id}/{photo_id}.jpg
-- avatars/{user_id}.jpg

-- Storage policies:
-- 任何人可看 (public bucket)
-- 登入者可上傳 (檢查 path 含自己的 user_id 或對應的 report_id)
```

### `verification-photos`

```sql
-- Bucket: verification-photos
-- Public: false (走失飼主驗證照,僅本人和管理員可看)

-- Path: lost-cat/{report_id}/{type}/{photo_id}.jpg
-- type: owner_with_cat | lifestyle

-- 透過 signed URL 提供臨時存取
```

## 重要查詢範例

### 自動擴展搜尋「附近需要幫助的貓」

```sql
-- 給定 user_lat, user_lng, 找最近的有貓的範圍
with radius_options as (
  select unnest(array[1, 2.5, 5, 10, 25, 50]) as radius_km
),
counts as (
  select 
    r.radius_km,
    count(*) as cat_count
  from radius_options r
  cross join lateral (
    select 1 from reports
    where deleted_at is null
      and status in ('need', 'lost', 'pending')
      and st_dwithin(
        location::geography,
        st_makepoint(:user_lng, :user_lat)::geography,
        r.radius_km * 1000
      )
  ) c
  group by r.radius_km
)
select min(radius_km) as final_radius
from counts
where cat_count >= 5;

-- 然後用這個 radius 查實際的貓
select 
  r.*,
  st_distance(r.location::geography, st_makepoint(:user_lng, :user_lat)::geography) / 1000 as distance_km,
  (select storage_path from report_photos where report_id = r.id order by display_order limit 1) as thumbnail_path
from reports r
where r.deleted_at is null
  and r.status in ('need', 'lost', 'pending')
  and st_dwithin(
    r.location::geography,
    st_makepoint(:user_lng, :user_lat)::geography,
    :radius_km * 1000
  )
order by 
  -- 綜合排序: 距離 + 時間
  (st_distance(r.location::geography, st_makepoint(:user_lng, :user_lat)::geography) / 1000 * 0.4) +
  (extract(epoch from (now() - r.last_activity_at)) / 86400 * 0.6) asc;
```

### 撿到家貓配對

```sql
select 
  r.id,
  r.name,
  r.tags,
  r.created_at,
  st_distance(r.location::geography, st_makepoint(:found_lng, :found_lat)::geography) / 1000 as distance_km,
  -- 計算分數
  (
    (1 - least(st_distance(r.location::geography, st_makepoint(:found_lng, :found_lat)::geography) / 5000, 1)) * 0.4
    + (cardinality(r.tags & :found_tags::text[])::float / greatest(cardinality(r.tags) + cardinality(:found_tags::text[]), 1)) * 0.4
    + (1 - least(extract(epoch from (now() - r.created_at)) / 86400 / 60, 1)) * 0.2
  ) as match_score
from reports r
where r.deleted_at is null
  and r.report_type = 'lost'
  and r.status = 'lost'
  and r.created_at > now() - interval '60 days'
  and st_dwithin(
    r.location::geography,
    st_makepoint(:found_lng, :found_lat)::geography,
    5000  -- 5km
  )
order by match_score desc
limit 3;
```

## Migration 順序

```
supabase/migrations/
├── 20260601000001_extensions.sql      # PostGIS, pg_cron, pgcrypto
├── 20260601000002_profiles.sql
├── 20260601000003_reports.sql
├── 20260601000004_report_updates.sql
├── 20260601000005_report_photos.sql
├── 20260601000006_rescue_applications.sql
├── 20260601000007_lost_cat_verifications.sql
├── 20260601000008_abuse_reports.sql
├── 20260601000009_push_subscriptions.sql
├── 20260601000010_notification_queue.sql
├── 20260601000011_storage_buckets.sql
├── 20260601000012_functions_triggers.sql
└── 20260601000013_rls_policies.sql
```
