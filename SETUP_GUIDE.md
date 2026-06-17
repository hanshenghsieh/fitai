# FitAI 完整設置指南

本指南將逐步帶你配置 FitAI，從第 0 週開始。

## 第 0 週：基礎設置

### 1. Supabase 設置（資料庫）

1. **創建帳號**
   - 前往 https://supabase.com
   - 使用 Google/GitHub 登入
   - 創建新 project，選擇 Taiwan 區域

2. **配置資料庫**
   - 複製 SQL migration 文件
   - 打開 Supabase dashboard → SQL Editor
   - 複製 `supabase-migrations/002-add-subscriptions-and-notifications.sql` 的內容
   - 貼上並執行

3. **獲取環境變量**
   - Project Settings → API
   - 複製 `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - 複製 `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - 複製 `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

4. **創建 Storage Bucket**
   - Storage → New bucket
   - 名稱：`inbody-uploads`
   - 設置為 Public

---

### 2. Firebase 設置（推播通知）

1. **創建項目**
   - 前往 https://console.firebase.google.com
   - 創建新項目，命名 `FitAI`

2. **啟用 Cloud Messaging**
   - 左側選單 → Cloud Messaging
   - 點擊「啟用」

3. **獲取 Web SDK 配置**
   - Project Settings → General
   - 向下滾動找到「你的應用」
   - 如果沒有 Web 應用，點擊「</> 」創建
   - 複製 SDK 配置（firebaseConfig）
   - 填入 `.env.local`：
     ```
     NEXT_PUBLIC_FIREBASE_API_KEY=xxx
     NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx
     NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx
     NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxx
     NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxx
     NEXT_PUBLIC_FIREBASE_APP_ID=xxx
     ```

4. **獲取 VAPID Key**
   - Cloud Messaging → Web credentials
   - 複製「Key Pair」中的「Public key」
   - 填入 `NEXT_PUBLIC_FIREBASE_VAPID_KEY`

5. **設置 Admin SDK**
   - Project Settings → Service Accounts
   - 點擊「Generate new private key」
   - 複製整個 JSON
   - 填入 `FIREBASE_ADMIN_SDK=<JSON content>`

6. **配置 Webhook URL**
   - Cloud Messaging → Web configuration
   - 設置 Cloud Functions webhook
   - URL: `https://your-domain.com/api/webhooks/firebase`

---

### 3. Stripe 設置（支付系統）

1. **創建帳號**
   - 前往 https://stripe.com/tw
   - 創建商家帳號
   - 驗證身份和銀行帳戶

2. **獲取 API Key**
   - Dashboard → Developers → API Keys
   - 複製 Publishable key → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - 複製 Secret key → `STRIPE_SECRET_KEY`

3. **創建產品和價格**
   - Products → Create a product
   - 名稱：「FitAI 月付」
   - 價格：500 TWD
   - 期限：Monthly
   - 複製 Price ID → 稍後使用

4. **設置 Webhook**
   - Developers → Webhooks
   - Create endpoint
   - URL: `https://your-domain.com/api/webhooks/stripe`
   - Events to send:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
   - 複製 Signing secret → `STRIPE_WEBHOOK_SECRET`

---

### 4. 環境變量設置

1. **複製模板**
   ```bash
   cp .env.example .env.local
   ```

2. **填入所有值**
   - 從上面的步驟複製相應的值
   - 確保沒有空白的必填項

3. **驗證配置**
   ```bash
   npm run dev
   # 檢查是否有錯誤
   ```

---

## 第 1-2 週：開發測試

### 5. Service Worker 設置（推播）

1. **創建 public/firebase-messaging-sw.js**
   ```javascript
   importScripts('https://www.gstatic.com/firebasejs/9.20.0/firebase-app-compat.js')
   importScripts('https://www.gstatic.com/firebasejs/9.20.0/firebase-messaging-compat.js')

   firebase.initializeApp({
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_AUTH_DOMAIN",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_STORAGE_BUCKET",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   })

   const messaging = firebase.messaging()
   messaging.onBackgroundMessage((payload) => {
     console.log('Received background message', payload)
     const notificationTitle = payload.notification.title
     const notificationOptions = {
       body: payload.notification.body,
       icon: '/icon.png'
     }
     self.registration.showNotification(notificationTitle, notificationOptions)
   })
   ```

2. **更新 public/manifest.json**
   ```json
   {
     "name": "FitAI",
     "short_name": "FitAI",
     "description": "個性化健身助手",
     "start_url": "/",
     "display": "standalone",
     "theme_color": "#10b981",
     "background_color": "#ffffff",
     "icons": [
       {
         "src": "/icon-192.png",
         "sizes": "192x192",
         "type": "image/png"
       },
       {
         "src": "/icon-512.png",
         "sizes": "512x512",
         "type": "image/png"
       }
     ]
   }
   ```

### 6. 測試推播通知

1. **手動測試**
   ```bash
   # 在 Dashboard 頁面請求權限
   # 檢查 push_tokens 表是否有記錄
   ```

2. **發送測試通知**
   ```bash
   curl -X POST http://localhost:3000/api/send-notifications \
     -H "Content-Type: application/json" \
     -d '{
       "type": "breakfast",
       "userId": "user-id-here"
     }'
   ```

### 7. 測試支付流程

1. **進入 Settings 頁面**
2. **選擇 Stripe 支付**
3. **使用測試卡號**
   ```
   4242 4242 4242 4242
   過期日期：任意未來日期
   CVC：任意 3 位數
   ```

---

## 第 2-4 週：內容準備

### 8. 準備菜單照片

1. **需要的照片（20 張）**
   - 6 張早餐食材
   - 9 張午餐食材
   - 5 張晚餐食材

2. **拍攝規範**
   - 背景：白色或中性
   - 光線：自然光，避免陰影
   - 大小：至少 200x200px，1:1 比例
   - 格式：JPEG 或 PNG

3. **上傳到 CDN**
   - 使用 Cloudinary（免費）或 Imgix
   - 或直接上傳到 Supabase Storage

4. **更新菜單 URL**
   - `src/app/api/generate-plan/route.ts`
   - 將 `photo_url` 指向真實圖片

### 9. 準備訓練視頻

1. **需要的視頻（15 個）**
   - 5 個重訓動作教學
   - 5 個有氧運動教學
   - 5 個伸展教學

2. **錄製規範**
   - 解析度：HD (1280x720) 或以上
   - 時長：1-2 分鐘每個
   - 格式：MP4
   - 字幕：中英文（可選但推薦）

3. **上傳到 YouTube**
   - 上傳為不公開影片
   - 獲取 Video ID
   - 更新 `youtube_id` 字段

---

## 第 4-6 週：部署準備

### 10. 部署到 Vercel

1. **連接 GitHub Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/your-username/fitness-app
   git push -u origin main
   ```

2. **在 Vercel 部署**
   - 登入 https://vercel.com
   - Import Git Repository
   - 選擇你的 repo
   - 設置環境變量（從 .env.local 複製）
   - Deploy

3. **設置自訂域名**
   - Project Settings → Domains
   - 添加你的域名
   - 按照 Vercel 指示配置 DNS

### 11. 設置定時任務

1. **使用 EasyCron 或 Vercel Cron**
   ```
   EasyCron: https://www.easycron.com
   配置：每小時執行
   URL: https://your-domain.com/api/cron/send-scheduled-notifications
   Header: Authorization: Bearer YOUR_CRON_SECRET
   ```

2. **或使用 GitHub Actions**
   ```yaml
   # .github/workflows/cron.yml
   name: Scheduled Notifications
   on:
     schedule:
       - cron: '0 * * * *'
   jobs:
     cron:
       runs-on: ubuntu-latest
       steps:
         - name: Trigger cron
           run: |
             curl -X POST https://your-domain.com/api/cron/send-scheduled-notifications \
               -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
   ```

---

## 第 6-8 週：測試與優化

### 12. 完整流程測試

1. **Onboarding 流程**
   - 新用戶註冊
   - 完成問卷
   - 檢查計畫是否生成

2. **Daily Check-in**
   - 標記今日完成
   - 檢查進度顯示

3. **推播通知**
   - 早上 7:00 檢查早餐通知
   - 中午 12:00 檢查午餐通知
   - 下午 6:30 檢查晚餐通知
   - 晚上 7:00 檢查運動通知
   - 晚上 9:00 檢查達標提醒

4. **支付流程**
   - 進入 Settings
   - 購買訂閱
   - 檢查 Stripe webhook 是否成功

5. **達標計算**
   - 完成 20 天的 check-in
   - 檢查 free_upgrades 表是否有記錄
   - 驗證下月訂閱是否免費

---

## 第 8-9 週：App Store 上架

### 13. iOS App Store

1. **申請開發者帳號**
   - 前往 https://developer.apple.com
   - 支付 $99/年
   - 完成身份驗證

2. **使用 Expo 編譯 iOS**
   ```bash
   # 如果使用 Next.js + React Native
   expo build:ios
   ```

3. **上傳到 App Store Connect**
   - 創建新應用
   - 填入應用信息
   - 上傳 IPA 文件
   - 等待審核（通常 1-3 天）

### 14. Google Play Store

1. **申請開發者帳號**
   - 前往 https://play.google.com/console
   - 支付 $25 一次性費用
   - 完成設置

2. **編譯 Android**
   ```bash
   # 如果使用 Expo
   expo build:android
   ```

3. **上傳到 Google Play**
   - 創建新應用
   - 上傳 APK 或 AAB
   - 等待審核（通常 2-4 小時）

---

## 常見問題排查

### 推播不工作
1. 檢查 Firebase config 是否正確
2. 檢查 Service Worker 是否註冊
3. 檢查瀏覽器權限設置
4. 查看 Firebase Cloud Messaging 是否啟用

### 支付失敗
1. 檢查 Stripe keys 是否正確
2. 檢查 webhook endpoint 是否可達
3. 檢查支付網址是否使用 HTTPS
4. 測試 webhook 重新發送

### 資料庫錯誤
1. 檢查 SQL migration 是否執行
2. 檢查 RLS policies 是否正確
3. 檢查 JWT token 是否有效

---

## 需要幫助？

- Supabase 文檔：https://supabase.com/docs
- Firebase 文檔：https://firebase.google.com/docs
- Stripe 文檔：https://stripe.com/docs
- 聯繫技術支持：support@fitai.app

---

## 檢查清單

- [ ] Supabase 已設置
- [ ] Firebase 已配置
- [ ] Stripe 帳號已創建
- [ ] 環境變量已填入
- [ ] Service Worker 已創建
- [ ] 菜單照片已準備
- [ ] 訓練視頻已準備
- [ ] 已部署到 Vercel
- [ ] Webhook 已配置
- [ ] 完整流程已測試
- [ ] Ready for App Store submission!
