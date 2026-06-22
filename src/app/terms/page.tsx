import type { Metadata } from 'next'
import LegalPageLayout, { LegalSection } from '@/components/legal/LegalPageLayout'
import { SUPPORT_EMAIL } from '@/lib/support'
import { createPageMetadata } from '@/lib/site-metadata'

export const metadata: Metadata = createPageMetadata({
  title: '服務條款',
  description: 'BetterBit 服務條款與使用規範。',
  path: '/terms',
})

export default function TermsPage() {
  return (
    <LegalPageLayout title="服務條款" updated="2026 年 6 月 18 日">
      <LegalSection title="接受條款">
        <p>
          使用 BetterBit（再健一點）即表示你同意本條款。若不同意，請停止使用並刪除帳號。
        </p>
      </LegalSection>

      <LegalSection title="服務內容">
        <p>
          BetterBit 提供個人化飲食與運動計畫、食物紀錄、進度追蹤等生活參考功能。我們可能更新、調整或終止部分功能，並會盡合理努力維持服務穩定。
        </p>
      </LegalSection>

      <LegalSection title="非醫療服務">
        <p>
          本服務不提供醫療建議、診斷或治療。所有熱量、營養與運動建議僅供參考。若有健康疑慮、懷孕、慢性病或受傷，使用前請諮詢醫師或合格專業人員。
        </p>
      </LegalSection>

      <LegalSection title="帳號責任">
        <ul className="list-disc pl-5 space-y-1">
          <li>你需提供正確的 Email 並妥善保管密碼</li>
          <li>帳號下的所有活動由你負責</li>
          <li>不得濫用服務、嘗試未授權存取或干擾系統運作</li>
          <li>你可隨時在設定中刪除帳號</li>
        </ul>
      </LegalSection>

      <LegalSection title="訂閱與付款">
        <p>
          部分功能需付費訂閱。目前 Web 版透過 Stripe 處理付款。試用期與訂閱價格以 App 內顯示為準。
        </p>
        <p>
          訂閱會自動續期，除非你取消。取消後，通常可继续使用至當期結束。達標免費延長等優惠條件以 App 內說明為準。
        </p>
        <p>
          iOS App 上架後，App 內訂閱將遵循 Apple App Store 規範與 Apple 媒體服務條款。
        </p>
      </LegalSection>

      <LegalSection title="智慧財產">
        <p>
          BetterBit 的介面、文案、算法與資料庫內容受著作權與其他法律保護。未經授權不得複製、修改或商業利用。
        </p>
      </LegalSection>

      <LegalSection title="責任限制">
        <p>
          在法律允許的最大範圍內，BetterBit 對因使用或無法使用服務所造成的間接、附帶或衍生損害不負責任。服務以「現狀」提供，我們不保證完全無錯誤或不中斷。
        </p>
      </LegalSection>

      <LegalSection title="條款變更">
        <p>
          我們可能更新本條款。重大變更會在 App 或網站上公告。繼續使用即視為接受更新後的條款。
        </p>
      </LegalSection>

      <LegalSection title="準據法">
        <p>
          本條款以中華民國法律為準據法。爭議以台灣台北地方法院為第一審管轄法院，法律另有規定者從其規定。
        </p>
      </LegalSection>

      <LegalSection title="聯絡我們">
        <p>
          條款相關問題請寄至{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="underline underline-offset-2">
            {SUPPORT_EMAIL}
          </a>
          。
        </p>
      </LegalSection>
    </LegalPageLayout>
  )
}
