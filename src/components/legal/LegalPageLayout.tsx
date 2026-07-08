import Link from 'next/link'
import { colors } from '@/lib/design-system'
import { APP_DISPLAY_NAME } from '@/lib/support'
import LegalBackLink from '@/components/legal/LegalBackLink'

interface Props {
  title: string
  updated: string
  children: React.ReactNode
}

export default function LegalPageLayout({ title, updated, children }: Props) {
  return (
    <div
      className="legal-page-shell min-h-[100dvh] overflow-y-auto overscroll-y-contain"
      style={{ backgroundColor: colors.bg.canvas }}
    >
      <header className="legal-page-header px-5">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4 min-h-[48px]">
          <LegalBackLink />
          <p className="text-[12px] shrink-0 pr-1" style={{ color: colors.text.tertiary }}>
            {APP_DISPLAY_NAME}
          </p>
        </div>
      </header>

      <main className="legal-page-main max-w-2xl mx-auto px-5 py-8">
        <h1 className="text-[26px] font-semibold mb-2" style={{ color: colors.text.primary }}>
          {title}
        </h1>
        <p className="text-[13px] mb-8" style={{ color: colors.text.tertiary }}>
          最後更新：{updated}
        </p>
        <div
          className="space-y-6 text-[15px] leading-relaxed legal-prose"
          style={{ color: colors.text.secondary }}
        >
          {children}
        </div>

        <nav
          className="mt-12 pt-8 border-t flex flex-wrap gap-x-5 gap-y-2 text-[13px]"
          style={{ borderColor: colors.border.subtle }}
        >
          <Link href="/privacy" style={{ color: colors.text.secondary }}>隱私權政策</Link>
          <Link href="/terms" style={{ color: colors.text.secondary }}>服務條款</Link>
          <Link href="/support" style={{ color: colors.text.secondary }}>支援</Link>
        </nav>
        <p className="mt-8 text-[12px] text-center pb-4" style={{ color: colors.text.tertiary }}>
          已到底部
        </p>
      </main>
    </div>
  )
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-[17px] font-semibold" style={{ color: colors.text.primary }}>
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  )
}
