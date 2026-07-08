import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { colors } from '@/lib/design-system'

interface Props {
  title?: string
  subtitle?: string
}

/** Sticky back bar for pages opened from 設定 (premium, etc.). Safe area handled by app-shell. */
export default function SettingsSubpageHeader({ title, subtitle }: Props) {
  return (
    <header
      className="sticky top-0 z-20 px-5 app-page-top pb-4"
      style={{ backgroundColor: colors.bg.canvas }}
    >
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 min-h-[48px] -ml-1 px-1 text-[15px] rounded-xl active:opacity-70"
        style={{ color: colors.text.secondary, fontWeight: 500 }}
      >
        <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
        設定
      </Link>
      {title ? (
        <>
          <h1 className="text-[22px] font-medium tracking-tight mt-2" style={{ color: colors.text.primary }}>
            {title}
          </h1>
          {subtitle ? (
            <p className="text-[15px] mt-3 leading-relaxed" style={{ color: colors.text.secondary }}>
              {subtitle}
            </p>
          ) : null}
        </>
      ) : null}
    </header>
  )
}
