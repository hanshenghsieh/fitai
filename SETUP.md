# FitAI - 設定指南

## 1. Supabase 設定

### 建立專案
1. 前往 [supabase.com](https://supabase.com) 建立新專案
2. 到 **SQL Editor** → 貼上 `supabase/schema.sql` 全部內容執行
3. 到 **Storage** → 建立兩個 Bucket：
   - `inbody-uploads`（Private）
   - `progress-photos`（Private）

### 取得金鑰
到 **Settings → API** 複製：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 2. Anthropic API 金鑰

前往 [console.anthropic.com](https://console.anthropic.com) 取得 `ANTHROPIC_API_KEY`

## 3. 環境變數

複製 `.env.local` 並填入所有金鑰：

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=your-random-secret-string
```

## 4. 本地開發

```bash
npm install
npm run dev
```

開啟 http://localhost:3000

## 5. 部署到 Vercel

```bash
npx vercel --prod
```

在 Vercel Dashboard → Settings → Environment Variables 加入所有金鑰。
`NEXT_PUBLIC_APP_URL` 改為 `https://betterbit.app`。

## 架構說明

```
src/
├── app/
│   ├── (app)/          # 需要登入的頁面
│   │   ├── dashboard/  # 今日打卡 (主頁)
│   │   ├── weekly/     # 本週計畫 + 週回饋
│   │   ├── progress/   # 進度圖表 + 量測記錄
│   │   └── settings/   # 設定 + 登出
│   ├── login/
│   ├── register/
│   ├── onboarding/     # 6步驟初始問卷
│   └── api/
│       ├── generate-plan/  # Claude API 生成計畫
│       ├── parse-inbody/   # Claude Vision 解析 InBody
│       ├── checkin/        # 每日打卡 CRUD
│       ├── measurements/   # 體重體脂記錄
│       ├── weekly-feedback/# 週回饋表單
│       └── cron/weekly-regen/ # Vercel Cron 自動週計畫
├── lib/
│   ├── supabase/       # 瀏覽器/伺服器端客戶端
│   └── claude/         # AI 客戶端 + Prompt + Zod 驗證
├── components/
│   ├── dashboard/      # 底部導航 + 每日打卡 UI + 週計畫
│   ├── progress/       # 圖表 + 量測表單
│   └── settings/       # 設定頁面
└── types/              # TypeScript 型別定義
```

## 安全說明

- 所有資料表均啟用 Row Level Security (RLS)
- Claude API 金鑰僅存在伺服器端
- Supabase Service Role Key 僅用於 Cron Job
- InBody 圖片存於私有 Storage Bucket（簽名 URL）
- 用戶輸入已在寫入 Prompt 前進行 sanitize

## 飲食安全限制

- 每日熱量下限：女性 1200 kcal / 男性 1500 kcal
- BMI < 17.5 或 > 40 時顯示警告提示
- 目標速率過快時（>4 kg/月）自動警告
- 所有頁面顯示「非醫療建議」免責聲明
