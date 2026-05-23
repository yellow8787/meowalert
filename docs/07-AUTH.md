# 07 · 認證、權限與隱私

## 認證流程: Google OAuth via Supabase

### 設定步驟

1. **Google Cloud Console**:
   - 建立 OAuth 2.0 Client ID
   - 應用類型: Web application
   - Authorized JavaScript origins:
     - `http://localhost:3000` (開發)
     - `https://meowalert.vercel.app` (production)
   - Authorized redirect URIs:
     - `https://xxxxx.supabase.co/auth/v1/callback` (Supabase 提供)

2. **Supabase Dashboard**:
   - Authentication > Providers > Google
   - 填入 Client ID 和 Client Secret
   - Enable

3. **前端**:
```ts
// src/components/auth/GoogleSignInButton.tsx
async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback?next=${currentPath}`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      }
    }
  });
}
```

4. **Callback handler**:
```ts
// src/app/auth/callback/route.ts
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/';
  
  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  
  redirect(next);
}
```

5. **Trigger 自動建立 profile** (見 `04-DATABASE.md` 的 handle_new_user)

## Session 管理

使用 `@supabase/ssr` 統一 server-side 和 client-side session:

```ts
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}
```

```ts
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

```ts
// middleware.ts (Next.js root)
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
```

## 受保護的路由

### 用 `AuthGuard` 元件 (推薦)

```tsx
// src/components/auth/AuthGuard.tsx
'use client';

export function AuthGuard({ children, redirectTo = '/' }: Props) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  
  useEffect(() => {
    if (!loading && !user) {
      setShowLoginDialog(true);
    }
  }, [loading, user]);
  
  if (loading) return <LoadingScreen />;
  
  if (!user) {
    return (
      <>
        <LoginDialog 
          open={showLoginDialog} 
          onCancel={() => router.push(redirectTo)}
        />
        {/* 顯示模糊背景 */}
      </>
    );
  }
  
  return <>{children}</>;
}
```

### 或在 server component 直接檢查

```tsx
// src/app/(auth)/layout.tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function AuthLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/?login=required');
  }
  
  return <>{children}</>;
}
```

## 管理員權限

### 檢查 role

```tsx
// src/lib/auth/admin.ts
export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/?login=required');
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
    redirect('/');
  }
  
  return { user, profile };
}
```

```tsx
// src/app/admin/layout.tsx
export default async function AdminLayout({ children }) {
  await requireAdmin();
  return <>{children}</>;
}
```

### 將使用者設為 admin

第一個 admin 在 Supabase Dashboard 直接 SQL:
```sql
update profiles set role = 'superadmin' where id = '<your_user_id>';
```

之後 superadmin 可在後台介面新增 admin。

## 隱私與資料保護

### 個資分類

| 等級 | 資料 | 誰能看 |
|---|---|---|
| **公開** | display_name, avatar_url, 回報內容, 接力紀錄 | 任何人 |
| **依使用者意願公開** | line_id, messenger_url | 任何人 (使用者主動公開) |
| **僅管理員可看** | email, IP 等技術資訊 | admin, superadmin |
| **加密儲存** | (無敏感資料需要加密儲存) | — |

### 位置模糊化

地圖上的位置精確度限制:

```ts
// 將精確座標模糊到約 100m
function blurLocation(lat: number, lng: number) {
  return {
    lat: Math.round(lat * 1000) / 1000,  // 3 位小數 ≈ 111m
    lng: Math.round(lng * 1000) / 1000,
  };
}
```

實際實作在 DB trigger (見 `04-DATABASE.md`)。

**何時顯示精確位置**:
- 詳情頁文字描述: 顯示完整地址 (例如「新生南路二段 1 號」)
- 詳情頁迷你地圖: 顯示精確 pin
- **僅限登入使用者**

**何時顯示模糊位置**:
- 首頁全域地圖: 永遠模糊
- 列表卡片的地址描述: 只到行政區+路名 (例如「大安區新生南路」)

### Email 保護

- Email 從不在前端 API 回應出現 (除了 `/api/me/*` 自己看自己)
- 管理員後台顯示 email 但要記錄在管理員操作日誌
- 不允許其他使用者透過 ID 查到 email

### 照片隱私

**上傳前提示**:
```tsx
<PrivacyWarning>
  📸 請避開他人臉部、車牌與店家招牌。
  照片會自動壓縮並可能用於公開展示。
</PrivacyWarning>
```

**EXIF 處理**:
- 上傳時自動移除照片中的 GPS EXIF 資料 (避免精確位置外洩)
  - 用 `exifr` 讀 timestamp 後,前端用 canvas 重新編碼去除 EXIF
- 保留 timestamp 供機器審核
- 走失家貓的「飼主+貓合照」可在前端用 canvas 模糊人臉部分 (第二版)

**儲存**:
- 一般照片: `report-photos` bucket (public, 任何人可看 URL)
- 飼主驗證照: `verification-photos` bucket (private, signed URL 1 小時)

### Cookie & Tracking

- 不使用第三方 analytics (例如 Google Analytics) 初版避免複雜化
- 必要的 cookies (Supabase session) 用 first-party
- 隱私政策頁面 (`/about/privacy`) 清楚說明

## 防濫用機制

### 1. 強制照片 + EXIF 驗證

- 每筆 update 都必須附照片
- 機器審核驗證 EXIF timestamp < 24h
- 無 EXIF 的進人工複審

### 2. 接力距離限制

- 換位置 / 再次目擊 需要 user GPS 距離 < 2km
- 救援申請不限距離 (可能已帶走貓)
- 走失家貓飼主自己不限距離 (可能在家更新)

### 3. 頻率限制

| 動作 | 限制 |
|---|---|
| 新增報告 | 5 次 / 10 分鐘 |
| 接力更新 | 10 次 / 10 分鐘 |
| 救援申請 | 3 次 / 24 小時 |
| 檢舉 | 5 次 / 小時 |

### 4. 機器審核

見 `08-MODERATION.md`

### 5. 檢舉與停權

- 任何人可檢舉任何回報
- 同一帳號被檢舉 3 次以上自動進高優先佇列
- 管理員可:
  - 隱藏單筆回報
  - 停權使用者 (24h / 7d / 永久)
  - 刪除帳號

### 6. 黑名單域名

LINE ID 和 Messenger URL 驗證:
```ts
function validateLineId(id: string) {
  // 限制英數和底線,長度 4-50
  return /^[a-zA-Z0-9_.-]{4,50}$/.test(id);
}

function validateMessengerUrl(url: string) {
  // 只允許 m.me/ 或 facebook.com/messages/t/ 開頭
  return /^https:\/\/(m\.me|www\.facebook\.com\/messages\/t)\//.test(url);
}
```

## 帳號刪除

提供「刪除帳號」功能:

```ts
async function deleteAccount() {
  // 1. 個人資料軟刪除 (保留歷史協作紀錄)
  await supabase
    .from('profiles')
    .update({
      display_name: '已刪除的使用者',
      avatar_url: null,
      line_id: null,
      messenger_url: null,
      is_banned: false, // 不是 ban,是自願刪除
    })
    .eq('id', user.id);
  
  // 2. 未被接力的自己的 reports 軟刪除
  await supabase
    .from('reports')
    .update({ deleted_at: new Date() })
    .eq('created_by', user.id)
    .lt('update_count', 2); // 只有自己一筆 update 的
  
  // 3. 已被接力的 reports 保留 (匿名顯示「已刪除使用者」)
  
  // 4. 移除推播訂閱
  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id);
  
  // 5. Delete auth user (需要 service_role key,在 Edge Function 做)
  await fetch('/api/me/delete', { method: 'POST' });
  
  // 6. 登出
  await supabase.auth.signOut();
}
```

## GDPR / 個資法 合規

雖然只服務台灣,但好習慣:

1. **資料下載**: 使用者可請求下載自己的資料 (`/api/me/export`)
2. **資料刪除**: 上述帳號刪除流程
3. **明確同意**: 第一次使用前顯示隱私政策、服務條款
4. **資料外洩通知**: 若有外洩,72 小時內通知使用者

## 安全 Header

```ts
// next.config.js
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { 
    key: 'Content-Security-Policy', 
    value: "default-src 'self'; img-src 'self' data: https://*.supabase.co https://*.googleusercontent.com https://maps.googleapis.com https://*.tile.openstreetmap.org; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.supabase.co https://maps.googleapis.com https://nominatim.openstreetmap.org wss://*.supabase.co;"
  },
  { key: 'Permissions-Policy', value: 'camera=(self), geolocation=(self), notifications=(self)' },
];
```

## 環境變數安全

| 變數 | 前綴 | 環境 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | NEXT_PUBLIC_ (前端可見) | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | NEXT_PUBLIC_ | All |
| `SUPABASE_SERVICE_ROLE_KEY` | 無前綴 (僅後端) | Server only |
| `GOOGLE_PLACES_API_KEY` | 無前綴 (僅後端) | Server only |
| `VAPID_PRIVATE_KEY` | 無前綴 (僅後端) | Server only |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | NEXT_PUBLIC_ | All |

**規則**:
- 任何含 secret/private 的 key 不要有 `NEXT_PUBLIC_` 前綴
- Google Places API key 必須在 Google Cloud 設定 referer/IP restrictions
- Supabase service role key 只在 server-side 用 (api routes, edge functions)
