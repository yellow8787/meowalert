# 02 · 使用者流程

## 13 個核心畫面

| # | 路由 | 畫面 | 需登入 |
|---|---|---|---|
| 1 | `/` | 首頁地圖 | ❌ |
| 2 | (modal) | 登入彈窗 | — |
| 3 | `/report` | 回報選類型 | ✅ |
| 4 | `/report/stray` | 回報街貓 | ✅ |
| 5 | `/report/stray/similar` | 附近相似 (回報街貓中繼步驟) | ✅ |
| 6 | `/cat/[id]` | 貓咪詳情 | ❌ (但精確位置需登入) |
| 7 | `/cat/[id]/help` | 我願意幫忙 | ✅ |
| 8 | `/cat/[id]/rescue` | 送出救援申請 | ✅ |
| 9 | (modal) | 距離限制提示 | — |
| 10 | `/report/lost` | 我的家貓走失了 | ✅ |
| 11 | `/report/found` | 撿到家貓 | ✅ |
| 12 | `/hospitals` | 附近動物醫院 | ❌ |
| 13 | `/profile` | 個人資料 | ✅ |

## 主要使用流程

### 流程 A: 路人發現受傷街貓 (新增回報)

```
首頁地圖 (1)
   ↓ 點「新增回報」
登入彈窗 (2) [若未登入]
   ↓ Google 登入
回報選類型 (3)
   ↓ 選「看到需要救援的流浪貓」
回報街貓 (4)
   ↓ 1. 拍照 → 2. 標位置 → 3. 暱稱 → 4. 子標籤 → 5. 描述
   ↓ 按「下一步」
附近相似 (5)
   ↓ A. 是其中一隻 → 跳到那隻的詳情頁,自動新增「再次目擊」更新
   ↓ B. 都不是 → 新增為新貓 → 跳到該貓詳情頁
貓咪詳情 (6) [新建]
```

### 流程 B: 接力更新位置

```
首頁地圖 (1) 或 收到通知
   ↓ 點某隻貓的圖釘或卡片
貓咪詳情 (6)
   ↓ 點「換位置」
[檢查 GPS 距離]
   ↓ A. 在 2km 內 → 拍照 + 新位置 → 送出
   ↓ B. 超過 2km → 距離限制提示 (9)
回到貓咪詳情,看到自己的更新出現在時間軸
```

### 流程 C: 送出救援申請

```
貓咪詳情 (6)
   ↓ 點「我要送牠去救援」
登入彈窗 (2) [若未登入]
送出救援申請 (8)
   ↓ 1. 至少 2 張救援照片
   ↓ 2. 救援去向(下拉)
   ↓ 3. 機構/醫院名稱(從附近醫院選或自填)
   ↓ 4. 備註
   ↓ 送出
[機器審核]
   ↓ 通過 → 狀態變「救援中」(pending) → 進人工複審
   ↓ 失敗 → 顯示失敗原因,可重送
[人工審核] (管理員後台)
   ↓ 通過 → 狀態變「已救援」(rescued)
   ↓ 退回 → 通知使用者重新提交
```

### 流程 D: 走失家貓協尋

```
首頁 → 新增回報 → 選「我的家貓走失了」
   ↓
我的家貓走失了 (10)
   ↓ 1. 貓名
   ↓ 2. 飼主+貓合照
   ↓ 3. 至少 3 張生活照
   ↓ 4. 晶片號碼(選填)
   ↓ 5. 最後位置
   ↓ 6. 走失情境
   ↓ 送出 [檢查: 個人資料已設聯絡方式]
[管理員審核飼主身份]
   ↓ 通過 → 公開顯示在地圖上 (紫色)
[60 天無更新自動隱藏 或 飼主點「找到了」結案]
```

### 流程 E: 撿到家貓配對

```
首頁 → 新增回報 → 選「撿到一隻像家貓的貓」
   ↓
撿到家貓 (11)
   ↓ 1. 拍照 → 2. 位置 → 3. 特徵標籤 → 4. 目前牠在哪
[系統自動比對附近 5km 內「協尋中」的走失貓]
   ↓
顯示「可能符合的走失貓」列表
   ↓ 撿到的人點「看詳情」
走失貓詳情頁 → 點「聯絡飼主」→ 跳轉 LINE/Messenger
```

### 流程 F: 我願意幫忙

```
貓咪詳情 (6)
   ↓ 點「我願意幫忙」
[檢查使用者是否設定聯絡方式]
   ↓ A. 沒設定 → 跳到個人資料頁 (13) 提示設定
   ↓ B. 有設定 → 進入...
我願意幫忙 (7)
   ↓ 顯示原回報者的 LINE / Messenger 聯絡按鈕
   ↓ 點 LINE → 跳轉 line://ti/p/xxx
   ↓ 點 Messenger → 跳轉 m.me/xxx
```

### 流程 G: 查附近醫院

```
首頁 → 點下方 nav 的「醫院」icon
   ↓
附近動物醫院 (12)
   ↓ 排序選單: 相關度 / 評價 / 距離
   ↓ 篩選 chip: 營業中 / 24h / 評價 4.5+
   ↓ 點電話 → 直接撥號
   ↓ 點導航 → 跳轉 Google Maps
```

## 自動擴展搜尋邏輯

```
function findNearbyHelpfulCats(userLocation) {
  const radiuses = [1, 2.5, 5, 10, 25, 50]; // km
  const minCount = 5;
  
  for (const radius of radiuses) {
    const cats = queryActiveHelpfulCats(userLocation, radius);
    if (cats.length >= minCount) {
      return { cats, radius, expanded: radius > 2.5 };
    }
  }
  
  // 50km 內仍不足 → 回傳所有可得的貓 (可能是空陣列)
  return { 
    cats: queryActiveHelpfulCats(userLocation, 50), 
    radius: 50, 
    exhausted: true 
  };
}
```

**UI 顯示文案**:
- `radius <= 2.5km`: 「{地區},{城市} · {radius} 公里內 · {N} 隻需要幫助」
- `radius > 2.5km`: 「{地區},{城市} · 最近的在 {distance} 公里外 · {N} 隻需要幫助」
- `exhausted && N > 0`: 「全台灣 · {N} 隻需要幫助」
- `exhausted && N == 0`: 「目前台灣沒有待救援的貓 🎉 你可以成為第一個發現的人」

## 機器審核流程 (送出救援申請後)

```
Step 1: 照片時間驗證
  - 讀取 EXIF DateTime
  - 若 > 24 小時前 → 失敗,提示「請使用近期拍攝的照片」
  - 若無 EXIF → 警告但不擋,進人工複審

Step 2: 圖像辨識 (含貓?)
  - 用 TensorFlow.js MobileNet 在前端跑分類
  - 若 top 3 預測都不含 cat-related 類別 → 失敗,提示「未偵測到貓」
  - 若預測信心度 < 0.3 → 警告,進人工複審

Step 3: 位置合理性
  - 救援地點 vs 最後一次目擊地點的距離
  - 若 > 5 公里 → 警告,進人工複審 (「貓不會跑這麼遠」)
  - 若 <= 5 公里 → 通過

Step 4: 頻率限制
  - 同帳號 5 分鐘內已送出過救援申請 → 失敗,提示「請稍候再試」
  - 同帳號 24 小時內 > 3 筆救援申請 → 警告,進人工複審

通過 (4/4 step pass): 狀態變「救援中」,進管理員人工複審佇列
失敗 (任一 step fail): 拒絕,顯示具體原因
警告 (任一 step warn): 狀態變「救援中」,進管理員人工複審佇列 (高優先級)
```

## 距離限制檢查 (換位置 / 再次目擊)

```
function canRelay(userGps, lastReportLocation) {
  const distance = haversineDistance(userGps, lastReportLocation);
  if (distance > 2.0) { // km
    return {
      allowed: false,
      reason: `你距離這隻貓 ${distance.toFixed(1)} 公里,超過 2 公里範圍`,
      action: '請確認你真的在現場,或舉報此回報為錯誤'
    };
  }
  return { allowed: true };
}
```

## 走失家貓 ↔ 撿到家貓 配對邏輯

```
function matchLostCat(foundCatReport) {
  const candidates = queryLostCats({
    status: 'lost',
    location: foundCatReport.location,
    radius: 5, // km
    daysAgo: 60 // 只看 60 天內
  });
  
  return candidates
    .map(lost => ({
      ...lost,
      score: 
        (distanceScore(lost.last_seen, foundCatReport.location) * 0.4) +
        (tagOverlap(lost.tags, foundCatReport.tags) * 0.4) +
        (recencyScore(lost.created_at) * 0.2)
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3); // 取分數最高 3 隻
}
```

## 通知觸發點

| 通知類型 | 觸發 | 收件人 | 設定可關 |
|---|---|---|---|
| 我的回報有新更新 | 別人對你的回報「換位置/再次目擊/救援」 | 原回報者 + 接力過的人 | ✅ |
| 附近有新緊急回報 | N 公里內有人新增「緊急救援」回報 | 範圍內已登入使用者 | ✅ (N 可調) |
| 救援申請審核結果 | 管理員通過/退回 | 申請者 | ✅ |
| 走失家貓審核結果 | 管理員通過/退回 | 飼主 | ✅ |
| 撿到家貓配對 | 撿到的貓符合某筆走失資料 | 走失飼主 | ✅ |
| 走失貓被通報目擊 | 有人接力更新走失貓的位置 | 飼主 | ✅ |
| 系統公告 | 管理員發布公告 | 全部使用者 | ❌ |
