# 10 · 開發階段與順序

## 推薦開發順序

按以下 7 個 milestone 順序開發,每完成一個 milestone 就有「可以動」的版本。

---

## Milestone 0: 專案初始化 (半天)

**目標**: 跑得起來的空殼

- [ ] `npx create-next-app@latest meowalert --typescript --tailwind --app --src-dir`
- [ ] 安裝核心套件 (見 `03-ARCHITECTURE.md`)
- [ ] 設定 `next-pwa` (manifest, service worker)
- [ ] 設定 shadcn/ui (`npx shadcn@latest init`)
- [ ] 建立 Supabase 專案,跑 migrations
- [ ] 建立基本 layout、底部 nav (空殼)
- [ ] 部署到 Vercel,確認 deploy pipeline 正常
- [ ] 確認 PWA 可加到主畫面 (Chrome DevTools Lighthouse 跑過)

**驗收**: 打開網址,看到一個空白頁面,但底部有 nav,在手機上可以「加到主畫面」。

---

## Milestone 1: 認證 (半天-1 天)

**目標**: Google 登入可用

- [ ] 設定 Supabase Auth Google provider
- [ ] 寫 OAuth callback route
- [ ] `useAuth` hook
- [ ] `LoginDialog` 元件
- [ ] `handle_new_user` trigger (自動建 profile)
- [ ] 個人資料頁 (基本版,只有顯示名稱、登出)

**驗收**: 點登入 → Google → 回到 app, profile 自動建立,可以登出。

---

## Milestone 2: 地圖 + 顯示貓 (2-3 天)

**目標**: 可以在地圖上看到貓 (用假資料)

- [ ] 整合 react-leaflet,顯示台北市地圖
- [ ] `useGeolocation` 取得使用者位置
- [ ] 用 SQL seed 插入 5-10 筆假貓資料
- [ ] `/api/cats` route 回傳貓
- [ ] `CatMarker` 元件,不同狀態不同顏色
- [ ] `BlurredCircle` 模糊範圍虛線圓
- [ ] 列表元件顯示在地圖下方
- [ ] `/api/cats/nearby` 自動擴展搜尋
- [ ] StatusFilterChips
- [ ] 點圖釘或卡片 → `/cat/[id]`

**驗收**: 打開首頁,看到地圖上有貓圖釘,下方列表,可以篩選,可以點進詳情。

---

## Milestone 3: 貓咪詳情 + 接力更新 (3-4 天)

**目標**: 可以看貓的時間軸,可以接力更新

- [ ] 貓咪詳情頁 (照片、描述、時間軸、行動按鈕)
- [ ] `CatTimeline` 元件
- [ ] `CatPhotoGallery` 多張照片
- [ ] **接力更新流程** (核心!)
  - [ ] `/cat/[id]/update?type=moved` 頁面
  - [ ] `PhotoUpload` (含前端壓縮)
  - [ ] `LocationInput` (GPS / 地圖選 / 輸入地址)
  - [ ] 距離限制檢查 (前端先檢查再送)
  - [ ] `/api/reports/[id]/updates` API
  - [ ] `DistanceLimitDialog`
- [ ] 即時更新 (Supabase Realtime subscribe)
- [ ] 個人統計 (回報數/救援數/接力數) 在 DB trigger 更新

**驗收**: 可以對既有的貓「換位置」「再次目擊」,時間軸自動更新,別人會即時看到。

---

## Milestone 4: 新增街貓回報 (3-4 天)

**目標**: 完整的新增回報流程

- [ ] `/report` 三種類型選擇頁
- [ ] `/report/stray` 表單
  - [ ] `PhotoUpload` (壓縮 + EXIF + 貓辨識)
  - [ ] `TagSelector`
  - [ ] `LocationInput`
- [ ] 整合 TensorFlow.js MobileNet (前端貓辨識)
- [ ] `/report/stray/similar` 附近相似清單
- [ ] `/api/reports/stray` API
- [ ] 配對演算法 (距離 + 標籤重疊)
- [ ] 送出後跳到該貓詳情頁

**驗收**: 拍照 → 標位置 → 填特徵 → 看到附近相似 → 選或新增 → 進詳情頁。

---

## Milestone 5: 醫院 + 救援申請 + 我願意幫忙 (3-4 天)

**目標**: 完整救援流程

- [ ] `/hospitals` 頁面
  - [ ] `/api/hospitals` 整合 Google Places
  - [ ] 排序、篩選 chips
  - [ ] 電話、導航按鈕
- [ ] `/cat/[id]/rescue` 救援申請表單
  - [ ] `PhotoUploadMulti` 多張照片
  - [ ] `HospitalSelector` (從附近選或自填)
- [ ] `moderate-rescue-application` Edge Function
- [ ] `AutoReviewProgress` 顯示審核進度
- [ ] 個人資料頁: 聯絡方式 (LINE / Messenger)
- [ ] `/cat/[id]/help` 「我願意幫忙」頁面
  - [ ] 顯示 LINE / Messenger 按鈕,點擊跳轉
- [ ] 救援後狀態變化 + 通知

**驗收**: 可以送出救援申請,機器審核會跑,管理員可後續處理 (Milestone 7)。可以查附近醫院。可以點「我願意幫忙」聯絡別人。

---

## Milestone 6: 走失家貓 + 撿到家貓 (3-4 天)

**目標**: 走失與撿到的完整功能

- [ ] `/report/lost` 走失家貓表單
  - [ ] 飼主+貓合照
  - [ ] 3+ 張生活照
  - [ ] 晶片號碼選填
- [ ] `/api/reports/lost`
- [ ] `lost_cat_verifications` 寫入
- [ ] `/report/found` 撿到家貓表單
- [ ] `match-found-cat` Edge Function
- [ ] 配對結果顯示
- [ ] 走失家貓在地圖紫色顯示
- [ ] 60 天自動歸檔 (pg_cron)
- [ ] 飼主「找到了」按鈕

**驗收**: 可以送走失家貓 (待審核),可以送撿到家貓並看到配對結果。

---

## Milestone 7: 管理員後台 (2-3 天)

**目標**: 你可以審核所有送出的申請

- [ ] `/admin` layout (檢查 role)
- [ ] `/admin` 儀表板 (顯示待處理數量)
- [ ] `/admin/rescue` 救援審核佇列
  - [ ] 列表 + 詳情 + 通過/退回
- [ ] `/admin/lost` 走失家貓審核
- [ ] `/admin/abuse` 檢舉處理
- [ ] `/admin/users` 使用者管理 + 停權
- [ ] 操作日誌 `admin_audit_log`
- [ ] 後台 RWD (桌機優先)

**驗收**: 用你的 superadmin 帳號登入後可看到後台,可以處理 milestone 5/6 送出的申請。

---

## Milestone 8: 推播 + 通知設定 (2-3 天)

**目標**: 使用者會收到通知

- [ ] Service Worker 推播 handler
- [ ] VAPID keys 設定
- [ ] `/api/me/push-subscribe`
- [ ] 個人資料頁通知設定 (含距離 slider)
- [ ] `notification_queue` 寫入邏輯
- [ ] `send-push-notifications` Edge Function
- [ ] pg_cron 排程
- [ ] 通知觸發點 (見 `02-USERFLOW.md`)
- [ ] iOS 加到主畫面引導

**驗收**: 別人對你的回報更新時,你會收到推播。

---

## Milestone 9: 檢舉 + 隱私 + 細節 (1-2 天)

**目標**: 防濫用機制完整

- [ ] `ReportMoreMenu` (右上角 ⋯)
- [ ] 檢舉表單
- [ ] `/api/abuse-reports`
- [ ] 自動隱藏 (被檢舉 3 次)
- [ ] 帳號刪除流程
- [ ] 隱私政策、服務條款頁面
- [ ] 公開統計頁 `/stats`

**驗收**: 可以檢舉,管理員可以處理,使用者可以刪除自己的帳號。

---

## Milestone 10: 上線前 polish (1-2 天)

**目標**: 上線

- [ ] PWA icons (192, 512, maskable)
- [ ] Splash screens (iOS)
- [ ] OG image (分享預覽)
- [ ] favicon
- [ ] 404 / error 頁面
- [ ] Loading skeleton
- [ ] Empty states
- [ ] 在實際裝置測試 (iOS Safari, Android Chrome)
- [ ] Lighthouse 跑分 (目標 PWA > 90, Accessibility > 90)
- [ ] 上線檢查清單 (見 `09-DEPLOYMENT.md`)
- [ ] 第一篇宣傳文 (FB 社團、PTT)

**驗收**: 公開上線!

---

## 預估總時程

| Milestone | 預估 |
|---|---|
| 0. 初始化 | 0.5 天 |
| 1. 認證 | 0.5-1 天 |
| 2. 地圖 + 顯示貓 | 2-3 天 |
| 3. 貓詳情 + 接力 | 3-4 天 |
| 4. 新增街貓 | 3-4 天 |
| 5. 醫院 + 救援 + 幫忙 | 3-4 天 |
| 6. 走失 + 撿到 | 3-4 天 |
| 7. 管理員後台 | 2-3 天 |
| 8. 推播 + 通知 | 2-3 天 |
| 9. 檢舉 + 隱私 | 1-2 天 |
| 10. Polish + 上線 | 1-2 天 |
| **合計** | **21-31 天 (3-4 週密集開發)** |

如果只有部分時間 (例如下班後),預估 2-3 個月。

---

## 第二版功能 (上線後再加)

依優先級:

### 高優先 (上線後 1-3 個月內考慮)
- AI 自動描述照片 (用 Claude API 或 Google Vision)
- 通知聚合 (一次發多筆通知合併)
- 多管理員 + 志工審核員制度
- 黑名單域名 / IP 偵測
- 「我的回報」列表 polish (篩選、排序)

### 中優先 (上線後 3-6 個月)
- 離線地圖
- 桌機版 admin 體驗優化
- 公開統計儀表板 (動保推廣用)
- 故事頁面 (展示成功救援案例)
- 串接政府晶片資料庫驗證走失飼主
- 跟 TNR / 中途之家整合

### 低優先 (有資源再做)
- 多語言 (英文、日文)
- 原生 app 包裝 (Capacitor)
- AR 看貓 (好玩)
- 社群功能 (按讚、留言)
- 餵食點地圖
- 認養配對

---

## Claude Code 開發建議

當你把這份文件給 Claude Code 時:

### 1. 開始時告訴 Claude Code
```
請依照 docs/ 內的規格文件,以 milestone 0 開始開發 MeowAlert 專案。
先讀 README.md,再依文件編號順序讀其他文件。
完成 milestone 0 後停下來讓我確認。
```

### 2. 每個 milestone 結束時
- 自己手動測一遍
- Push 到 GitHub,看 Vercel preview
- 用真實手機開來看
- 確認後再進下一個 milestone

### 3. 遇到分歧時的優先級
1. 規格文件明文寫的 > 一般慣例
2. 已實作的程式碼風格 > 從頭設計
3. 簡單可動 > 完美但複雜

### 4. 不要讓 Claude Code 一次做太多
- 一個 milestone 一個 milestone 來
- 每個 milestone 內也可以再切小段
- 例如 milestone 5 切成 5a (醫院)、5b (救援)、5c (我願意幫忙)

### 5. 測試策略
第一版不寫 unit test (節省時間)。改成:
- 每個 milestone 結束後手動 E2E 測一遍
- 用 Playwright 寫 1-2 個關鍵流程的 smoke test (登入 + 新增回報)
- Lighthouse 確保不影響效能

---

## 如果預算 / 時間有限

可以再縮減第一版功能。**最小可上線版本 (MVP)**:

- ✅ Milestone 0-5 + 7 (管理員)
- ❌ 暫緩 Milestone 6 (走失家貓 + 撿到家貓)
- ❌ 暫緩 Milestone 8 (推播)
- ❌ 暫緩 Milestone 9 (檢舉)

MVP 時程: 約 2 週密集 / 1.5 個月兼職。

但你說「要做完整」,所以建議做完所有 milestone 再上線。
