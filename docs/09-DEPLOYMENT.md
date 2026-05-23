# 09 · 部署步驟

## 部署架構

```
GitHub (原始碼)
   ↓ git push
Vercel (前端 PWA, 自動 deploy)
   ↓ runtime API calls
Supabase Cloud (後端 + DB + Auth + Storage)
   ↓ 呼叫
Google Places API
OpenStreetMap (Tile + Nominatim)
```

## 一次性前置設定

### 1. 申請帳號

- [ ] [GitHub](https://github.com) (放原始碼)
- [ ] [Supabase](https://supabase.com) (後端)
- [ ] [Vercel](https://vercel.com) (前端部署)
- [ ] [Google Cloud Console](https://console.cloud.google.com) (Places API + OAuth)

### 2. Supabase 設定

1. 建立新專案
   - Region: **Tokyo (ap-northeast-1)** (距離台灣最近)
   - Database password: 安全保管
   - Pricing: Free tier 開始

2. 取得 keys (Settings > API):
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (機密)

3. 啟用 extensions (Database > Extensions):
   - [ ] `postgis` (地理查詢)
   - [ ] `pg_cron` (定時任務)
   - [ ] `pgcrypto` (內建,UUID 用)

4. 跑 migrations:
   ```bash
   npm install -g supabase
   supabase login
   supabase link --project-ref <your_ref>
   supabase db push
   ```

5. 建立 Storage buckets (Storage > Create bucket):
   - `report-photos` (Public, 1 MB limit, image/jpeg + image/webp)
   - `verification-photos` (Private, 1 MB limit, image/jpeg + image/webp)

6. 設定 Storage policies (SQL Editor):
   見 `04-DATABASE.md` Storage Buckets 章節

7. 設定 Auth (Authentication > Providers > Google):
   - 啟用 Google provider
   - 填入 Google OAuth Client ID 和 Secret (下一步取得)

### 3. Google Cloud 設定

1. 建立專案 `meowalert`

2. **啟用 APIs** (APIs & Services > Library):
   - [ ] Places API (新版,不是舊版)
   - [ ] Maps JavaScript API (備用,不一定要)

3. **建立 API Key** (APIs & Services > Credentials > Create credentials > API key):
   - 名稱: `MeowAlert Places API`
   - **Application restrictions**: 
     - HTTP referrers: `meowalert.vercel.app/*`, `localhost:3000/*`
   - **API restrictions**: 限定 Places API
   - 取得後 → `GOOGLE_PLACES_API_KEY`

4. **建立 OAuth Client** (Credentials > Create credentials > OAuth client ID):
   - 應用類型: Web application
   - 名稱: `MeowAlert OAuth`
   - Authorized JavaScript origins:
     - `http://localhost:3000`
     - `https://meowalert.vercel.app`
   - Authorized redirect URIs:
     - `https://<your-supabase-ref>.supabase.co/auth/v1/callback`
   - 取得 Client ID 和 Client Secret → 填入 Supabase Auth

5. **設定預算警示** (Billing > Budgets & alerts):
   - 建立月預算 $50 USD
   - 50% / 90% / 100% 都發 email
   - **這是必做**,避免意外帳單

### 4. VAPID Keys (推播)

```bash
npm install -g web-push
web-push generate-vapid-keys --json
```

輸出:
```json
{
  "publicKey": "Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "privateKey": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

- `publicKey` → `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `privateKey` → `VAPID_PRIVATE_KEY`

### 5. Vercel 設定

1. 連結 GitHub repo
2. 設定環境變數 (Project Settings > Environment Variables):
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   GOOGLE_PLACES_API_KEY
   NEXT_PUBLIC_VAPID_PUBLIC_KEY
   VAPID_PRIVATE_KEY
   VAPID_SUBJECT=mailto:your-email@example.com
   NEXT_PUBLIC_APP_URL=https://meowalert.vercel.app
   NEXT_PUBLIC_ADMIN_EMAILS=your-email@example.com
   ```
3. Trigger deployment

## 開發環境設定

### 1. Clone repo & install

```bash
git clone <your-repo>
cd meowalert
npm install
```

### 2. 環境變數

```bash
cp .env.local.example .env.local
# 編輯 .env.local 填入上面的 keys
```

### 3. 啟動

```bash
npm run dev
```

訪問 http://localhost:3000

### 4. 本地 Supabase (選用)

如果想完全本地測試:

```bash
supabase init
supabase start
# 會起 local PostgreSQL + Auth + Studio
```

## CI/CD

Vercel 自動處理:
- Push to `main` → 自動 deploy production
- 開 PR → 自動 deploy preview (拿到一個 preview URL)
- Push 到其他 branch → 也 deploy preview

不需要額外 GitHub Actions (但可加 lint/test workflow)。

### 建議 GitHub Actions (選用)

```yaml
# .github/workflows/check.yml
name: Check
on: [pull_request]
jobs:
  lint-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
```

## Edge Functions 部署

```bash
cd supabase/functions

# 本地測試
supabase functions serve moderate-rescue-application

# 部署
supabase functions deploy moderate-rescue-application
supabase functions deploy match-found-cat
supabase functions deploy send-push-notifications
```

設定環境變數 (Edge Function 環境):
```bash
supabase secrets set VAPID_PRIVATE_KEY=xxx
supabase secrets set VAPID_SUBJECT=mailto:xxx
```

## 定時任務 (pg_cron)

在 Supabase SQL Editor 跑:

```sql
-- 每天凌晨 2 點歸檔過時回報
select cron.schedule(
  'archive-stale',
  '0 2 * * *',
  $$select auto_archive_stale_reports();$$
);

-- 每 5 分鐘觸發附近緊急回報通知
select cron.schedule(
  'notify-nearby-urgent',
  '*/5 * * * *',
  $$select net.http_post(
    url := 'https://<your-ref>.supabase.co/functions/v1/cron-notify-nearby-urgent',
    headers := '{"Authorization": "Bearer <service_role_key>"}'::jsonb
  );$$
);

-- 每分鐘處理推播佇列
select cron.schedule(
  'send-push',
  '* * * * *',
  $$select net.http_post(
    url := 'https://<your-ref>.supabase.co/functions/v1/send-push-notifications',
    headers := '{"Authorization": "Bearer <service_role_key>"}'::jsonb
  );$$
);
```

## 監控

### Sentry (錯誤追蹤) - 選用

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

設定 `SENTRY_DSN` 環境變數。

### Vercel Analytics - 內建

開啟 Vercel 專案的 Analytics tab,即可看流量。

### Supabase Logs

Supabase Dashboard > Logs 可看:
- DB queries
- Auth events
- Edge Functions logs
- Storage events

## 自訂域名 (選用)

當第一版穩定後,你可以:

1. **買域名** (建議: `meowalert.tw` 或 `meowalert.com`)
   - GoDaddy / Cloudflare / Namecheap 都可
   - 約 500-1500 台幣/年

2. **在 Vercel 加 domain**:
   - Project Settings > Domains > Add
   - 跟著指示設定 DNS

3. **更新 Google OAuth redirect URIs**:
   - 加入新域名

4. **更新環境變數**:
   - `NEXT_PUBLIC_APP_URL=https://meowalert.tw`

## 備份策略

### Supabase 自動備份

- Free tier: 7 天 PITR (Point-in-Time Recovery)
- Pro tier ($25/月): 30 天 PITR + daily backups

### 手動備份 (額外保險)

```bash
# 每週跑一次,存到本地
supabase db dump --data-only > backup-$(date +%Y%m%d).sql

# 或 schema-only
supabase db dump --schema-only > schema-$(date +%Y%m%d).sql
```

### 照片備份

第一版不另外備份 (Supabase Storage 已 replicate)。

第二版可考慮:
- 每月把 `report-photos` bucket 同步到 AWS S3 (用 rclone)

## 上線檢查清單

部署 production 前確認:

- [ ] 所有環境變數已設定 (Vercel + Supabase secrets)
- [ ] Google OAuth redirect URIs 包含 production URL
- [ ] Google Places API key 有 referer 限制
- [ ] Google Cloud 預算警示已設
- [ ] Supabase Auth 啟用 Google provider
- [ ] Storage buckets 已建立並設好 policies
- [ ] 所有 migrations 已跑
- [ ] Edge Functions 已部署
- [ ] pg_cron 排程已設定
- [ ] PWA manifest 和 icons 已準備
- [ ] Service Worker 註冊正常 (用 DevTools 確認)
- [ ] 在實際手機上測過 (iOS + Android)
- [ ] Lighthouse PWA 分數 > 90
- [ ] 第一個 admin 帳號已升級 role
- [ ] 服務條款、隱私政策頁面已寫
- [ ] 推播通知測試成功
- [ ] 機器審核測試成功 (用測試圖測各種 case)

## 上線後監控

- [ ] 每天看 Sentry / Vercel Logs 有無錯誤
- [ ] 每週看 Supabase Usage (DB / Storage / Bandwidth)
- [ ] 每週看 Google Cloud Billing
- [ ] 每天清空審核佇列

## 常見問題排查

### "Service worker not registering"
- 確認 `next-pwa` 設定正確
- 確認是 HTTPS (localhost 例外)
- 清快取重試

### "Supabase auth callback 404"
- 確認 Google OAuth redirect URI 指向 Supabase callback, 不是直接到 app
- 確認 Supabase Auth > URL Configuration 的 Site URL 設定正確

### "Push notifications not working on iOS"
- 必須先「加到主畫面」才能收推播 (iOS 限制)
- iOS 16.4+ 才支援
- 必須 HTTPS

### "Map tiles not loading"
- OpenStreetMap tile server 有 rate limit
- 高用量時建議用 CDN cache 或 Mapbox tiles

### "Google Places returning ZERO_RESULTS"
- 確認 API key 啟用了 Places API
- 確認 referrer restriction 包含當前域名
- 在 Google Cloud Console 查 API metrics

## 緊急應變

如果突然遇到大量假回報 / 攻擊:

1. **立刻停權**: 在 Supabase Dashboard SQL Editor 跑
   ```sql
   update profiles set is_banned = true 
   where id in (<suspicious_ids>);
   ```

2. **暫時關閉註冊**: Supabase Dashboard > Auth > Settings > Allow new signups = OFF

3. **緊急公告**: 在 app 首頁顯示維護中

4. **回滾資料**: 用 PITR 恢復到攻擊前

## 成本預估 (粗估)

### 第一階段 (< 1000 使用者)
- Supabase: 免費
- Vercel: 免費
- Google Places: < $200 額度內 = 免費
- 域名: ~600 NTD/年
- **合計: ~600 NTD/年**

### 第二階段 (1000-10000 使用者)
- Supabase Pro: $25/月 = $300/年
- Vercel Pro: $20/月 = $240/年 (如果需要)
- Google Places: 可能仍在免費額度
- **合計: ~$600/年 (約 18000 NTD/年)**

### 第三階段 (> 10000 使用者)
- 上述 + 自架 storage (S3) ~ $50/月
- 上述 + Mapbox tiles ~ $50/月
- **合計: 視規模, 約 60000-100000 NTD/年**
