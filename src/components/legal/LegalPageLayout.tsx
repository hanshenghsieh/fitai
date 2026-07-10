import Link from 'next/link'
import { BB_V2 } from '@/lib/betterbit-v2'
import { APP_DISPLAY_NAME } from '@/lib/support'
import LegalBackLink from '@/components/legal/LegalBackLink'
import V2PageBackground from '@/components/betterbit-v2/V2PageBackground'
import V2Card from '@/components/betterbit-v2/V2Card'

interface Props {
  title: string
  updated: string
  children: React.ReactNode
}

export default function LegalPageLayout({ title, updated, children }: Props) {
  return (
    <V2PageBackground className="min-h-[100dvh]">
      <header className="legal-page-header px-5 pt-[max(8px,var(--app-safe-top,0px))]">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4 min-h-[48px]">
          <LegalBackLink />
          <p className="text-[14px] shrink-0 pr-1" style={{ color: BB_V2.text.deepGreen, fontWeight: 700 }}>
            {APP_DISPLAY_NAME}
          </p>
        </div>
      </header>

      <main className="legal-page-main max-w-2xl mx-auto px-5 py-6 pb-12">
        <V2Card padding="24px 22px" className="!rounded-[28px]">
          <h1 className="text-[24px] mb-2" style={{ color: BB_V2.text.deepGreen, fontWeight: 700 }}>
            {title}
          </h1>
          <p className="text-[13px] mb-8" style={{ color: BB_V2.text.muted }}>
            最後更新：{updated}
          </p>
          <div className="space-y-6 text-[15px] leading-relaxed legal-prose" style={{ color: BB_V2.text.secondary }}>
            {children}
          </div>

          <nav className="mt-12 pt-8 border-t flex flex-wrap gap-x-5 gap-y-2 text-[13px]" style={{ borderColor: BB_V2.border }}>
            <Link href="/privacy" style={{ color: BB_V2.text.secondary }}>
              隱私權政策
            </Link>
            <Link href="/terms" style={{ color: BB_V2.text.secondary }}>
              服務條款
            </Link>
            <Link href="/support" style={{ color: BB_V2.text.secondary }}>
              支援
            </Link>
          </nav>
        </V2Card>
      </main>
    </V2PageBackground>
  )
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-[17px]" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  )
}
