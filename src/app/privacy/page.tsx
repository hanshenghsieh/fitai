import type { Metadata } from 'next'
import LegalPageLayout, { LegalSection } from '@/components/legal/LegalPageLayout'
import { SUPPORT_EMAIL } from '@/lib/support'
import { createPageMetadata } from '@/lib/site-metadata'

export const metadata: Metadata = createPageMetadata({
  title: '隱私權政策',
  description: 'BetterBit 如何收集、使用與保護你的個人資料。',
  path: '/privacy',
})

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="隱私權政策" updated="2026 年 6 月 18 日">
      <LegalSection title="我們是誰">
        <p>
          BetterBit（再健一點）提供個人化飲食與運動計畫的生活參考服務。我們重視你的隱私，只收集提供服務所需的資料，不販售、不公開你的個人資訊。
        </p>
      </LegalSection>

      <LegalSection title="我們收集哪些資料">
        <ul className="list-disc pl-5 space-y-1">
          <li>帳號資料：Email、密碼（由 Supabase Auth 加密儲存）</li>
          <li>個人檔案：暱稱、性別、年齡、身高、體重、體脂、目標、飲食偏好、器材與生活節奏</li>
          <li>使用紀錄：每日飲食、運動、喝水、打卡與週回饋</li>
          <li>食物照片：若你使用拍照記錄，照片會上傳以供 AI 估算營養（你可選擇不使用）</li>
          <li>訂閱資料：Stripe 付款與訂閱狀態（我們不儲存完整信用卡號）</li>
          <li>推播 token：若你開啟通知，我們儲存裝置推播識別碼</li>
          <li>健康資料（選填）：INBODY 報告、體重歷史；Apple Health 連線功能尚未正式啟用</li>
        </ul>
      </LegalSection>

      <LegalSection title="資料如何使用">
        <ul className="list-disc pl-5 space-y-1">
          <li>生成與調整你的個人化計畫</li>
          <li>記錄進度、熱量銀行與週回饋</li>
          <li>處理訂閱、試用與客服</li>
          <li>改善產品體驗（不含出售個人資料給第三方廣告商）</li>
        </ul>
      </LegalSection>

      <LegalSection title="第三方服務">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Supabase</strong> — 帳號、資料庫與檔案儲存</li>
          <li><strong>Stripe</strong> — 訂閱付款處理</li>
          <li><strong>Firebase</strong> — 推播通知（若啟用）</li>
          <li><strong>Anthropic</strong> — 食物照片與 INBODY 報告解析（AI）</li>
          <li><strong>Vercel</strong> — 網站與 API 託管</li>
        </ul>
        <p>這些服務僅在提供功能所需範圍內處理資料，並受各自隱私政策約束。</p>
      </LegalSection>

      <LegalSection title="資料保存與刪除">
        <p>
          資料在你使用服務期間保存。你可在 App 設定 → 危險區域 →「刪除帳號」永久刪除帳號及相關資料。刪除後無法復原。
        </p>
        <p>
          若你透過 Email 聯絡我們要求刪除資料，我們會在合理時間內處理。
        </p>
      </LegalSection>

      <LegalSection title="健康免責">
        <p>
          BetterBit 提供生活參考與營養估算，不是醫療建議、診斷或治療。身體不適請先休息，並諮詢合格醫療專業人員。
        </p>
      </LegalSection>

      <LegalSection title="聯絡我們">
        <p>
          隱私相關問題請寄至{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="underline underline-offset-2">
            {SUPPORT_EMAIL}
          </a>
          。
        </p>
      </LegalSection>
    </LegalPageLayout>
  )
}
