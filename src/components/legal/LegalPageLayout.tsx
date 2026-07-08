import Link from 'next/link'
import { colors } from '@/lib/design-system'
import { APP_DISPLAY_NAME } from '@/lib/support'

interface Props {
  title: string
  updated: string
  children: React.ReactNode
}

export default function LegalPageLayout({ title, updated, children }: Props) {
  return (
    <div
      className="auth-page-shell min-h-[100dvh] overflow-y-auto overscroll-y-contain"
      style={{ backgroundColor: colors.bg.canvas }}
    >
      <header
        className="sticky top-0 z-10 border-b backdrop-blur-sm px-5 pt-[max(env(safe-area-inset-top,12px),12px)] pb-3"
        style={{ backgroundColor: 'rgba(244, 242, 238, 0.95)', borderColor: colors.border.subtle }}
      >
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4 min-h-[44px]">
          <Link
            href="/"
            className="inline-flex items-center min-h-[44px] min-w-[44px] -ml-2 px-2 text-[15px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 rounded-lg"
            style={{ color: colors.text.secondary }}
          >
            ← 首頁
          </Link>
          <p className="text-[12px] shrink-0" style={{ color: colors.text.tertiary }}>
            {APP_DISPLAY_NAME}
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-8 pb-[max(env(safe-area-inset-bottom,24px),48px)]">
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
