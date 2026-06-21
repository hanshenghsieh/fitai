'use client'

import { colors } from '@/lib/design-system'

interface Props {
  children: React.ReactNode
  title: string
  description?: string
}

export default function SettingsSection({ title, description, children }: Props) {
  return (
    <section className="px-5 mb-8">
      <div className="mb-3 px-1">
        <h2 className="text-[13px] font-medium tracking-wide" style={{ color: colors.text.tertiary }}>
          {title}
        </h2>
        {description && (
          <p className="text-[12px] mt-1 leading-relaxed" style={{ color: colors.text.tertiary }}>
            {description}
          </p>
        )}
      </div>
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: colors.bg.elevated, border: `1px solid ${colors.border.subtle}` }}>
        {children}
      </div>
    </section>
  )
}
