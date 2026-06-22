import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPageLayout, { LegalSection } from '@/components/legal/LegalPageLayout'
import { SUPPORT_EMAIL } from '@/lib/support'
import { colors } from '@/lib/design-system'
import { createPageMetadata } from '@/lib/site-metadata'

export const metadata: Metadata = createPageMetadata({
  title: '支援',
  description: 'BetterBit 客服與常見問題。',
  path: '/support',
})

export default function SupportPage() {
  return (
    <LegalPageLayout title="支援" updated="2026 年 6 月 18 日">
      <LegalSection title="聯絡我們">
        <p>
          有問題、有想法，直接寫信。我們會看。
        </p>
        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=BetterBit 支援`}
          className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-[15px] font-medium mt-2"
          style={{ backgroundColor: colors.accent.action, color: '#FFFDF9' }}
        >
          {SUPPORT_EMAIL}
        </a>
        <p className="text-[13px] mt-3" style={{ color: colors.text.tertiary }}>
          通常 1–3 個工作天內回覆。
        </p>
      </LegalSection>

      <LegalSection title="常見問題">
        <div className="space-y-4">
          <div>
            <p className="font-medium" style={{ color: colors.text.primary }}>如何刪除帳號？</p>
            <p>
              登入後前往「設定」→「危險區域」→「刪除帳號」。此操作永久刪除所有資料，無法復原。
            </p>
          </div>
          <div>
            <p className="font-medium" style={{ color: colors.text.primary }}>如何取消訂閱？</p>
            <p>
              登入後前往「設定」→「會員」，可管理或取消訂閱。若透過 Stripe 付款，取消後仍可使用至當期結束。
            </p>
          </div>
          <div>
            <p className="font-medium" style={{ color: colors.text.primary }}>食物熱量準嗎？</p>
            <p>
              我們結合品牌菜單資料與 AI 估算，提供生活參考。實際攝取可能因份量、調味而有所不同。
            </p>
          </div>
          <div>
            <p className="font-medium" style={{ color: colors.text.primary }}>這是醫療建議嗎？</p>
            <p>
              不是。BetterBit 是生活參考工具，不能取代醫師或營養師的專業判斷。身體不適請先休息並就醫。
            </p>
          </div>
        </div>
      </LegalSection>

      <LegalSection title="相關文件">
        <p>
          <Link href="/privacy" className="underline underline-offset-2">隱私權政策</Link>
          {' · '}
          <Link href="/terms" className="underline underline-offset-2">服務條款</Link>
        </p>
      </LegalSection>
    </LegalPageLayout>
  )
}
