# 03 · 技術架構

## 總覽

```
┌──────────────────────────────────────────────────────────┐
│                    使用者裝置 (手機/桌機)                │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              Next.js PWA (React SPA)                │ │
│  │  - Service Worker (推播 / 離線基本支援)             │ │
│  │  - Leaflet 地圖元件                                 │ │
│  │  - TensorFlow.js (前端貓咪辨識)                    │ │
│  │  - browser-image-compression (前端照片壓縮)         │ │
│  └─────────────────────────────────────────────────────┘ │
└───────────┬──────────────────────────┬───────────────────┘
            │                          │
            │ HTTPS                    │ HTTPS
            ▼                          ▼
┌────────────────────────┐  ┌──────────────────────────────┐
│  Supabase              │  │  外部 API                    │
│  ┌──────────────────┐  │  │  ┌────────────────────────┐ │
│  │ PostgreSQL DB    │  │  │  │ Google Places API      │ │
│  │ - cats, reports  │  │  │  │ (動物醫院搜尋)         │ │
│  │ - users, updates │  │  │  └────────────────────────┘ │
│  └──────────────────┘  │  │  ┌────────────────────────┐ │
│  ┌──────────────────┐  │  │  │ OpenStreetMap          │ │
│  │ Auth (Google)    │  │  │  │ - Tile server (地圖)   │ │
│  └──────────────────┘  │  │  │ - Nominatim (Geocoding)│ │
│  ┌──────────────────┐  │  │  └────────────────────────┘ │
│  │ Storage (照片)   │  │  │  ┌────────────────────────┐ │
│  └──────────────────┘  │  │  │ Web Push Service       │ │
│  ┌──────────────────┐  │  │  │ (FCM/Apple Push)       │ │
│  │ Realtime (推送)  │  │  │  └────────────────────────┘ │
│  └──────────────────┘  │  │                              │
│  ┌──────────────────┐  │  └──────────────────────────────┘
│  │ Edge Functions   │  │
│  │ - 機器審核       │  │
│  │ - 配對演算法     │  │
│  │ - 推播觸發       │  │
│  └──────────────────┘  │
└────────────────────────┘
            │
            │ Hosted on
            ▼
┌────────────────────────┐
│  Supabase Cloud        │
│  (us-east-1 等)        │
└────────────────────────┘

前端部署:
┌────────────────────────┐
│  Vercel                │
│  (CDN, Edge Network)   │
│  meowalert.vercel.app  │
└────────────────────────┘
```

## 技術選型理由

### 前端框架: Next.js 15 (App Router)

**選它的理由**:
- React 生態最成熟,Claude Code 支援最好
- App Router 內建路由,不用另外設 React Router
- `next-pwa` 套件成熟,做 PWA 簡單
- 部署到 Vercel 一鍵完成,自帶 CDN
- 雖然這個 app 主要是 CSR,但 SSR 能力未來可做 SEO (動保推廣頁)

**替代方案考慮過**:
- 純 React + Vite: 更輕量但要自己拼路由、PWA、部署
- Remix: 不錯但生態小、Claude Code 經驗較少
- Astro: 不適合 app-like 互動重的應用

### UI: Tailwind CSS + shadcn/ui

**選它的理由**:
- Tailwind 上手快、設計一致性高、bundle 小
- shadcn/ui 是「複製到專案」而非套件,可自由修改
- 元件庫覆蓋廣 (Button, Dialog, Form, Toast, Sheet, Drawer 等)
- 兩者 Claude Code 都熟

### 後端: Supabase

**選它的理由**:
- PostgreSQL (比 Firebase 的 NoSQL 更符合這種關聯資料)
- Auth 內建,Google OAuth 設定容易
- Storage 內建,照片上傳一條龍
- Realtime 內建,地圖即時更新
- Edge Functions 用 Deno,寫 TypeScript 不用切換心智模型
- 免費額度大 (500MB DB, 1GB Storage, 50,000 monthly active users)
- Open source,未來可自架

**替代方案考慮過**:
- Firebase: NoSQL 對「貓的更新紀錄」這種一對多關聯不順手
- 自己架 Express + Postgres: 工作量太大,維運麻煩
- AWS Amplify: 學習曲線陡

### 地圖: Leaflet + OpenStreetMap

**選它的理由**:
- 完全免費,沒有 API 用量焦慮
- Leaflet 是最成熟的 web 地圖函式庫
- `react-leaflet` 整合 React 良好
- OSM 台灣資料夠用 (街道、行政區、主要 POI 完整)

**替代方案考慮過**:
- Google Maps: 體驗最好但有費用風險
- Mapbox: 介於兩者,但仍要綁卡
- MapLibre: OSM-based 但生態較小

**詳見** `09-DEPLOYMENT.md` 的 Google Cloud Setup 章節

### POI 搜尋: Google Places API

**選它的理由**:
- 動物醫院資料豐富 (評價、營業時間、電話、地址完整)
- 只在「使用者主動查醫院」或「救援申請填醫院」時呼叫,用量小
- 免費額度 $200/月 足夠初期使用
- 台灣資料品質高

**用量估算 (粗估)**:
- 1000 個活躍使用者
- 平均每人每月查 2 次醫院
- 1000 × 2 = 2000 次/月
- 遠低於免費額度 (約 12000 次/月)

### 地址轉座標: OSM Nominatim

**選它的理由**:
- 完全免費
- 台灣行政區資料完整
- 「輸入地址」這個功能用量極低,品質夠用

**注意事項**:
- Nominatim 公開服務有 rate limit (1 次/秒)
- 第一版用公開服務沒問題,若日後量大可自架

### PWA: next-pwa

**選它的理由**:
- Next.js 官方推薦套件
- 自動生成 service worker、manifest
- 支援推播、離線快取
- 設定簡單

### 推播: Web Push API + Service Worker

**選它的理由**:
- 標準 Web API,不需第三方 SDK
- iOS 16.4+ 已支援
- 不用付費
- 透過 VAPID keys 直接送

**替代方案考慮過**:
- OneSignal: 方便但免費版有限制、會收集分析資料
- Firebase Cloud Messaging: 要混用 Firebase 不簡潔

### 照片壓縮: browser-image-compression

**選它的理由**:
- 純前端,不用後端處理
- 設定簡單 (maxSizeMB, maxWidthOrHeight, quality)
- 已優化的 Web Worker 不會卡 UI

**設定值**:
```ts
{
  maxSizeMB: 0.5,
  maxWidthOrHeight: 1200,
  useWebWorker: true,
  fileType: 'image/jpeg',
  initialQuality: 0.85
}
```

### 圖像分類: TensorFlow.js MobileNet

**選它的理由**:
- 純前端跑,不用 server
- MobileNet 模型小 (~16MB),首次載入後快取
- ImageNet 預訓練,已知 cat / kitten / tabby / Persian / Siamese 等類別
- 不用付 Google Vision API 費用

**判斷邏輯**:
```ts
const CAT_CLASSES = [
  'Egyptian cat', 'tabby', 'tiger cat', 'Persian cat',
  'Siamese cat', 'cougar', 'lynx', 'kitten'
];

async function isCat(imageFile: File): Promise<boolean> {
  const predictions = await model.classify(image);
  return predictions
    .slice(0, 3)
    .some(p => CAT_CLASSES.some(c => p.className.toLowerCase().includes(c.toLowerCase())));
}
```

### 部署: Vercel (前端)

**選它的理由**:
- Next.js 原生支援,零設定
- 免費版含 CDN、HTTPS、自訂域名
- 自動 preview deployment (push to PR 自動部署測試環境)
- 全球 edge network

**免費版限制**:
- 100GB bandwidth/月 (初期夠用)
- 6000 build minutes/月
- 商業使用要升 Pro ($20/月)

### 部署: Supabase Cloud (後端)

**免費版**:
- 500MB Database
- 1GB Storage
- 2GB Bandwidth
- 50,000 monthly active users
- Edge Functions: 500k invocations/月

**何時升級 Pro ($25/月)**:
- 照片總量超過 1GB
- 使用者超過 50,000
- 需要 daily backup

## 環境變數

```bash
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...  # 僅後端用,不要 NEXT_PUBLIC_

# Google Places (只用於醫院搜尋)
GOOGLE_PLACES_API_KEY=AIzaxxx...

# Google OAuth (Supabase Auth 用)
# 在 Supabase Dashboard 設定,不需放 env

# Web Push (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=Bxxx...
VAPID_PRIVATE_KEY=xxx...
VAPID_SUBJECT=mailto:admin@meowalert.com

# App config
NEXT_PUBLIC_APP_URL=https://meowalert.vercel.app
NEXT_PUBLIC_ADMIN_EMAILS=admin@example.com  # 逗號分隔
```

## 主要 npm 套件

```json
{
  "dependencies": {
    "next": "15.x",
    "react": "19.x",
    "react-dom": "19.x",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.5.0",
    "leaflet": "^1.9.4",
    "react-leaflet": "^4.2.1",
    "browser-image-compression": "^2.0.2",
    "@tensorflow/tfjs": "^4.20.0",
    "@tensorflow-models/mobilenet": "^2.1.1",
    "web-push": "^3.6.7",
    "exifr": "^7.1.3",
    "zod": "^3.23.0",
    "react-hook-form": "^7.52.0",
    "@hookform/resolvers": "^3.9.0",
    "next-pwa": "^5.6.0",
    "tailwindcss": "^3.4.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.5.0",
    "lucide-react": "^0.400.0",
    "date-fns": "^3.6.0",
    "sonner": "^1.5.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/leaflet": "^1.9.0",
    "@types/web-push": "^3.6.0",
    "supabase": "^1.180.0"
  }
}
```

## PWA 設定要點

### manifest.json
```json
{
  "name": "MeowAlert · 街貓接力",
  "short_name": "MeowAlert",
  "description": "一起接力幫助台灣街貓",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#185FA5",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "shortcuts": [
    { "name": "新增回報", "url": "/report", "icons": [{"src":"/icon-report.png","sizes":"96x96"}] },
    { "name": "附近醫院", "url": "/hospitals", "icons": [{"src":"/icon-hospital.png","sizes":"96x96"}] }
  ]
}
```

### Service Worker
- Cache strategy: `NetworkFirst` 對 API,`CacheFirst` 對靜態資源
- 推播 listener 處理 push event,顯示 notification
- 點 notification 開啟對應頁面

### iOS 提示「加到主畫面」
- 第一次打開時,若是 iOS Safari 顯示提示
- 不要立刻提示,等使用者操作 3 次後才提示 (UX 研究)
- 提供「不再提示」選項

## 安全性架構

- 所有 API 走 HTTPS (Vercel + Supabase 自帶)
- Supabase Row Level Security (RLS) 保護資料表
- 環境變數區分 public/private,服務 role key 絕不暴露前端
- CSP header 防 XSS
- Rate limiting 在 Edge Functions 實作
- 照片上傳前先在前端壓縮並驗證 mime type
- 機器審核在送出時即時跑,失敗的不寫入 DB
- 詳見 `07-AUTH.md`
