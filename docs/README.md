# MeowAlert · 開發規格文件

> 一個讓所有人都能接力幫助台灣街貓的 PWA 平台。

## 🎯 給 Claude Code 的指引

如果你是 Claude Code 看到這份文件，請依以下順序閱讀：

1. **`01-PRODUCT.md`** — 先理解我們要做什麼、為什麼做
2. **`02-USERFLOW.md`** — 看完整使用者流程，每個畫面長什麼樣
3. **`03-ARCHITECTURE.md`** — 技術選型、為什麼選這些
4. **`04-DATABASE.md`** — Supabase 資料表設計（這份很重要,請仔細看)
5. **`05-API.md`** — API endpoint 規格
6. **`06-PAGES.md`** — 前端頁面與元件結構
7. **`07-AUTH.md`** — 認證、權限、隱私
8. **`08-MODERATION.md`** — 審核機制
9. **`09-DEPLOYMENT.md`** — 部署步驟
10. **`10-ROADMAP.md`** — 開發階段建議(依此順序開發)

## 📋 專案速覽

| 項目 | 內容 |
|---|---|
| **產品名** | MeowAlert (中文名:街貓接力) |
| **類型** | PWA (Progressive Web App) |
| **服務範圍** | 台灣 |
| **介面語言** | 繁體中文 |
| **目標使用者** | 動保志工、愛貓人士、走失貓飼主、一般路人 |
| **核心功能** | 街貓救援回報、走失家貓協尋、救援接力、附近動物醫院 |

## 🛠 技術棧

- **前端**: Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **後端**: Supabase (PostgreSQL + Auth + Storage + Realtime)
- **地圖**: Leaflet + OpenStreetMap
- **POI 搜尋**: Google Places API (僅用於動物醫院)
- **地址轉座標**: OpenStreetMap Nominatim
- **PWA**: next-pwa
- **推播**: Web Push API + Service Worker
- **照片壓縮**: browser-image-compression
- **圖像分類**: TensorFlow.js MobileNet
- **部署**: Vercel (前端) + Supabase (後端)

## 📁 專案結構建議

```
meowalert/
├── docs/                    # 這份規格文件
├── public/                  # 靜態資源、PWA manifest、icons
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (public)/        # 不需登入的頁面
│   │   │   ├── page.tsx     # 首頁 (地圖)
│   │   │   ├── cat/[id]/    # 貓咪詳情
│   │   │   ├── hospitals/   # 醫院列表
│   │   │   └── about/       # 關於頁
│   │   ├── (auth)/          # 需登入的頁面
│   │   │   ├── report/      # 新增回報
│   │   │   ├── lost/        # 走失家貓
│   │   │   ├── found/       # 撿到家貓
│   │   │   ├── rescue/      # 救援申請
│   │   │   └── profile/     # 個人資料
│   │   ├── admin/           # 管理員後台
│   │   │   ├── rescue/      # 救援審核
│   │   │   ├── lost/        # 走失家貓審核
│   │   │   └── reports/     # 檢舉處理
│   │   └── api/             # API routes
│   ├── components/          # React 元件
│   │   ├── ui/              # shadcn/ui 元件
│   │   ├── map/             # 地圖相關
│   │   ├── cat/             # 貓咪卡片、詳情
│   │   └── form/            # 表單元件
│   ├── lib/                 # 工具函式
│   │   ├── supabase/        # Supabase client
│   │   ├── moderation/      # 審核邏輯
│   │   ├── image/           # 照片壓縮
│   │   └── geo/             # 地理計算
│   ├── hooks/               # React hooks
│   ├── types/               # TypeScript 型別
│   └── styles/              # 全域樣式
├── supabase/
│   ├── migrations/          # SQL migration 檔案
│   ├── functions/           # Edge Functions (機器審核)
│   └── seed.sql             # 種子資料
├── .env.local.example       # 環境變數範本
├── next.config.js           # Next.js + PWA 設定
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## ✅ 開發前置作業 (使用者需要先做)

1. 申請 [Google Cloud 帳號](https://console.cloud.google.com/),啟用 Places API,設定預算警示為 $50 美金
2. 申請 [Supabase 帳號](https://supabase.com/),建立新專案
3. 申請 [Vercel 帳號](https://vercel.com/),連結 GitHub
4. 設定 [Google OAuth client](https://console.cloud.google.com/apis/credentials) 取得 Client ID/Secret
5. 申請 [VAPID keys](https://web-push-codelab.glitch.me/) (用於推播通知)

詳細步驟見 `09-DEPLOYMENT.md`。

## ⚖️ 設計原則

1. **行動優先**: 99% 使用者在手機上,設計優先考慮 375px 寬度
2. **降低門檻**: 不登入也能瀏覽,動作時才要求登入
3. **隱私為本**: 位置模糊化,聯絡資訊由使用者主動公開
4. **接力協作**: 沒有單一英雄,每個更新都是接力
5. **資料完整**: 不允許刪除已被接力的回報,保留協作歷史
6. **防濫用**: 強制照片、距離限制、機器審核、人工複審多層防護
