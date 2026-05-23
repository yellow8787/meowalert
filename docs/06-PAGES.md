# 06 · 頁面與元件結構

## 路由 (Next.js App Router)

```
src/app/
├── layout.tsx                  # 根 layout (含全域 providers)
├── page.tsx                    # 首頁地圖 (公開)
├── globals.css                 # Tailwind + 全域樣式
├── manifest.json               # PWA manifest
├── service-worker.ts           # Service Worker
│
├── (public)/                   # 不需登入的頁面 group
│   ├── cat/
│   │   └── [id]/
│   │       └── page.tsx        # 貓咪詳情
│   ├── hospitals/
│   │   └── page.tsx            # 附近醫院
│   ├── about/
│   │   └── page.tsx            # 關於、隱私政策、服務條款
│   └── stats/
│       └── page.tsx            # 公開統計
│
├── (auth)/                     # 需登入的頁面 group
│   ├── layout.tsx              # 檢查登入,未登入 redirect 或彈窗
│   ├── report/
│   │   ├── page.tsx            # 回報選類型
│   │   ├── stray/
│   │   │   ├── page.tsx        # 回報街貓表單
│   │   │   └── similar/
│   │   │       └── page.tsx    # 附近相似清單
│   │   ├── lost/
│   │   │   └── page.tsx        # 走失家貓
│   │   └── found/
│   │       └── page.tsx        # 撿到家貓
│   ├── cat/
│   │   └── [id]/
│   │       ├── rescue/
│   │       │   └── page.tsx    # 救援申請
│   │       ├── help/
│   │       │   └── page.tsx    # 我願意幫忙
│   │       └── update/
│   │           └── page.tsx    # 接力更新 (換位置/再次目擊)
│   ├── profile/
│   │   ├── page.tsx            # 個人資料
│   │   └── my-reports/
│   │       └── page.tsx        # 我的回報列表
│   └── notifications/
│       └── page.tsx            # 通知中心
│
├── admin/                      # 管理員後台
│   ├── layout.tsx              # 檢查 role
│   ├── page.tsx                # 後台首頁 (儀表板)
│   ├── rescue/
│   │   ├── page.tsx            # 救援審核佇列
│   │   └── [id]/
│   │       └── page.tsx        # 單筆審核
│   ├── lost/
│   │   ├── page.tsx            # 走失家貓審核
│   │   └── [id]/
│   │       └── page.tsx
│   ├── abuse/
│   │   └── page.tsx            # 檢舉處理
│   └── users/
│       ├── page.tsx            # 使用者管理
│       └── [id]/
│           └── page.tsx        # 單一使用者詳情
│
├── auth/                       # 認證流程
│   ├── callback/
│   │   └── route.ts            # OAuth callback
│   └── error/
│       └── page.tsx            # 登入錯誤
│
└── api/                        # 見 05-API.md
```

## 共用元件結構

```
src/components/
├── ui/                         # shadcn/ui 元件 (直接從 cli install)
│   ├── button.tsx
│   ├── dialog.tsx
│   ├── sheet.tsx               # 抽屜 (手機底部彈出)
│   ├── input.tsx
│   ├── select.tsx
│   ├── textarea.tsx
│   ├── badge.tsx               # 狀態 pill
│   ├── card.tsx
│   ├── toast.tsx               # sonner
│   ├── slider.tsx              # 通知距離調整
│   ├── switch.tsx
│   ├── tabs.tsx
│   ├── avatar.tsx
│   └── ...
│
├── layout/
│   ├── AppShell.tsx            # 主框架 (含底部 nav)
│   ├── BottomNav.tsx           # 底部導航 (地圖/醫院/我的)
│   ├── TopBar.tsx              # 頂部 (位置 + 篩選按鈕)
│   ├── BackHeader.tsx          # 內頁的返回 header
│   └── LoadingScreen.tsx
│
├── auth/
│   ├── LoginDialog.tsx         # 登入彈窗
│   ├── AuthGuard.tsx           # 包裹需登入的內容
│   └── GoogleSignInButton.tsx
│
├── map/
│   ├── CatMap.tsx              # 主地圖元件 (Leaflet wrapper)
│   ├── CatMarker.tsx           # 單一貓圖釘
│   ├── BlurredCircle.tsx       # 模糊範圍虛線圓
│   ├── MapControls.tsx         # 縮放、定位按鈕
│   ├── LocationPicker.tsx      # 用於回報的「在地圖選位置」
│   └── ClusterLayer.tsx        # 聚合圖層 (高 zoom out 時)
│
├── cat/
│   ├── CatCard.tsx             # 列表卡片 (含縮圖)
│   ├── CatStatusPill.tsx       # 狀態 pill (緊急/救援中/已救援/走失)
│   ├── CatTagBadge.tsx         # 子標籤 (受傷/卡困/...)
│   ├── CatDetailHeader.tsx     # 詳情頁照片區
│   ├── CatPhotoGallery.tsx     # 多張照片切換
│   ├── CatTimeline.tsx         # 接力時間軸
│   ├── CatActions.tsx          # 換位置/再次目擊/救援/幫忙 按鈕組
│   └── ReportMoreMenu.tsx      # 右上角「⋯」選單 (檢舉/分享)
│
├── form/
│   ├── PhotoUpload.tsx         # 拍照/選擇照片 + 壓縮 + 預覽
│   ├── PhotoUploadMulti.tsx    # 多張照片版本
│   ├── LocationInput.tsx       # 三合一: GPS/地圖/地址
│   ├── TagSelector.tsx         # 子標籤多選
│   ├── HospitalSelector.tsx    # 救援申請填醫院 (整合 Places API)
│   └── PrivacyWarning.tsx      # 「請避開臉部車牌」提示
│
├── filter/
│   ├── StatusFilterChips.tsx   # 緊急/救援中/走失/已救援
│   ├── SortSelector.tsx
│   └── FilterSheet.tsx         # 進階篩選抽屜
│
├── hospital/
│   ├── HospitalCard.tsx
│   ├── HospitalFilterChips.tsx
│   └── HospitalSortSelector.tsx
│
├── help/
│   ├── ContactButtons.tsx      # LINE/Messenger 按鈕
│   └── HelpSuggestions.tsx     # 「可以這樣幫忙」清單
│
├── moderation/
│   ├── AutoReviewProgress.tsx  # 機器審核進度顯示
│   └── ReviewStatusCard.tsx    # 「救援申請審核中」卡片
│
├── admin/
│   ├── RescueQueueItem.tsx
│   ├── LostVerifyCard.tsx
│   ├── AbuseReportCard.tsx
│   ├── UserBanDialog.tsx
│   └── AdminStats.tsx
│
└── common/
    ├── DistanceLimitDialog.tsx # 距離超限提示
    ├── EmptyState.tsx
    ├── ErrorState.tsx
    ├── ConfirmDialog.tsx
    ├── InstallPwaPrompt.tsx    # 引導加到主畫面
    ├── NotificationPermissionPrompt.tsx
    └── ShareSheet.tsx
```

## Hooks

```
src/hooks/
├── useAuth.ts                  # 取得 user, 登入登出
├── useProfile.ts               # 取得 / 更新 profile
├── useGeolocation.ts           # 取得 GPS,處理權限
├── useNearbyHelpfulCats.ts     # 自動擴展搜尋
├── useCat.ts                   # 單一 cat 資料 (含 realtime)
├── useCatUpdates.ts            # 接力更新即時更新
├── useHospitals.ts             # 醫院查詢 + 篩選 + 排序
├── usePhotoCompress.ts         # 照片壓縮
├── useCatDetector.ts           # TensorFlow.js 貓辨識
├── usePushSubscribe.ts         # 推播訂閱
├── useFoundCatMatch.ts         # 撿到家貓配對
├── useInfiniteScroll.ts
└── useToast.ts                 # sonner wrapper
```

## 全域狀態

用 React Context + Server State (Supabase),不需 Redux/Zustand。

```ts
// src/lib/contexts/AuthContext.tsx
export const AuthContext = createContext<{
  user: User | null;
  profile: Profile | null;
  signOut: () => Promise<void>;
}>({ /* defaults */ });

// src/lib/contexts/MapContext.tsx
// 地圖中心、zoom、選中的貓
```

對於需要長時間快取的資料 (例如貓的列表),用 SWR 或 React Query。建議用 **SWR** (更輕量):

```ts
import useSWR from 'swr';
const { data, error } = useSWR(`/api/cats/nearby?lat=...&lng=...`, fetcher);
```

## 關鍵頁面實作要點

### 首頁 (`/`)

```tsx
// src/app/page.tsx
'use client';

export default function HomePage() {
  const { location } = useGeolocation();
  const { cats, searchRadius, expanded, exhausted } = useNearbyHelpfulCats(location);
  
  return (
    <AppShell>
      <TopBar location={location} count={cats.length} />
      <StatusFilterChips />
      <CatMap cats={cats} userLocation={location} />
      <CatListPanel cats={cats} expanded={expanded} radius={searchRadius} />
      <FloatingButton onClick={() => router.push('/report')}>
        新增回報
      </FloatingButton>
    </AppShell>
  );
}
```

**Notes**:
- 地圖元件用 `dynamic(() => import('@/components/map/CatMap'), { ssr: false })` 避免 SSR 問題
- 列表和地圖共用同一份資料,點圖釘 highlight 列表項目
- 底部列表可上滑展開全螢幕、下滑收起 (用 shadcn/ui Sheet)

### 貓咪詳情 (`/cat/[id]`)

```tsx
export default async function CatDetailPage({ params }) {
  const cat = await fetchCat(params.id);
  if (!cat) notFound();
  
  return (
    <AppShell>
      <BackHeader title={cat.name} actions={<ReportMoreMenu />} />
      <CatPhotoGallery photos={cat.photos} />
      <CatDetailHeader cat={cat} />
      <CatTimeline updates={cat.updates} />
      <CatActions cat={cat} />
    </AppShell>
  );
}
```

### 回報街貓 (`/report/stray`)

多步驟表單,用 react-hook-form + zod:

```tsx
const schema = z.object({
  photo: z.instanceof(File),
  location: z.object({ lat: z.number(), lng: z.number(), address: z.string() }),
  name: z.string().min(1).max(20),
  tags: z.array(z.string()).min(1),
  description: z.string().max(500).optional(),
});

export default function ReportStrayPage() {
  const form = useForm({ resolver: zodResolver(schema) });
  
  async function onSubmit(data) {
    // 1. 前端壓縮照片
    const compressed = await compressImage(data.photo);
    
    // 2. 前端貓辨識
    const isCat = await detectCat(compressed);
    if (!isCat) {
      toast.warning('未偵測到貓,確定要繼續嗎?');
      // 仍允許繼續,但會標記
    }
    
    // 3. 跳到 similar 頁面
    router.push(`/report/stray/similar?${queryString({
      lat: data.location.lat, lng: data.location.lng,
      // ...暫存表單資料 (用 sessionStorage)
    })}`);
  }
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <PhotoUpload {...form.register('photo')} />
      <PrivacyWarning />
      <LocationInput {...form.register('location')} />
      <TextInput label="暱稱或特徵" {...form.register('name')} />
      <TagSelector {...form.register('tags')} />
      <Textarea label="詳細描述" {...form.register('description')} />
      <Button type="submit">下一步</Button>
    </form>
  );
}
```

### 個人資料 (`/profile`)

```tsx
export default function ProfilePage() {
  const { profile, updateProfile } = useProfile();
  
  return (
    <AppShell>
      <BackHeader title="個人資料" />
      <Avatar src={profile.avatar_url} fallback={profile.display_name[0]} />
      
      <StatsCard stats={profile.stats} />
      
      <Form>
        <Input label="顯示名稱" value={profile.display_name} />
        
        <Section title="聯絡方式 (至少填一個)">
          <Input label="LINE ID" icon={<LineIcon />} />
          <Input label="m.me/你的用戶名" icon={<MessengerIcon />} />
        </Section>
        
        <Section title="通知">
          <Switch label="我的回報有新更新" />
          <Switch label="附近有新緊急回報">
            <Slider 
              label={`${value} 公里內`}
              min={1} max={50} 
              value={profile.notify_nearby_radius_km}
            />
          </Switch>
          <Switch label="救援申請審核結果" />
          {/* ... */}
        </Section>
        
        <DangerZone>
          <Button variant="ghost" onClick={signOut}>登出</Button>
        </DangerZone>
      </Form>
    </AppShell>
  );
}
```

### 管理員 - 救援審核 (`/admin/rescue`)

```tsx
export default function AdminRescueQueue() {
  const { applications } = useRescueQueue();
  
  return (
    <AdminLayout>
      <Tabs defaultValue="pending">
        <TabList>
          <Tab value="pending">待審核 ({applications.length})</Tab>
          <Tab value="approved">已通過</Tab>
          <Tab value="rejected">已退回</Tab>
        </TabList>
        
        <TabContent value="pending">
          {applications.map(app => (
            <RescueQueueItem 
              key={app.id} 
              application={app}
              onApprove={() => approve(app.id)}
              onReject={() => reject(app.id)}
            />
          ))}
        </TabContent>
      </Tabs>
    </AdminLayout>
  );
}
```

## RWD 斷點

```css
/* tailwind.config.ts */
screens: {
  sm: '640px',   // 大手機
  md: '768px',   // 平板 (主要為 admin 桌機體驗)
  lg: '1024px',  // 桌機
  xl: '1280px',  // 大桌機
}
```

**設計策略**:
- `< 640px`: 主要設計目標,底部固定 nav,單欄
- `640px - 1024px`: 容器最大寬度限制在 480px,置中,讓內容仍是手機感
- `>= 1024px` (僅 admin): 雙欄或三欄佈局,側邊 nav

## 主題色

```ts
// tailwind.config.ts 對應的 CSS variables
--color-status-need: #E24B4A;     // 緊急救援 (紅)
--color-status-pending: #378ADD;  // 救援中 (藍)
--color-status-rescued: #97C459;  // 已救援 (綠)
--color-status-lost: #7F77DD;     // 走失家貓 (紫)

--color-tag-injured: #FCEBEB / #791F1F;
--color-tag-trapped: #FAEEDA / #854F0B;
--color-tag-kitten: #E1F5EE / #0F6E56;
--color-tag-maybe-lost: #EEEDFE / #3C3489;

// 品牌色 (用於 logo / 主按鈕)
--color-brand: #185FA5;
```

## 圖示

統一用 `lucide-react`:

```tsx
import { Cat, MapPin, Camera, Filter, ... } from 'lucide-react';
```

主要圖示對照:
- 貓: `Cat`
- 位置: `MapPin`
- GPS: `Crosshair`
- 拍照: `Camera`
- 篩選: `SlidersHorizontal`
- 搜尋: `Search`
- 鈴鐺: `Bell`
- 緊急: `AlertTriangle`
- 時鐘 (待審): `Clock`
- 通過: `Check`
- 駁回: `X`
- 走失: `HeartCrack`
- 撿到: `Home`
- 醫院: `Building2` 或 `Stethoscope`
- 電話: `Phone`
- 導航: `Navigation`
- LINE: 用 SVG (沒有 lucide 圖示)
- Messenger: 用 SVG
- Google: `LogIn` 或 SVG
