'use client'

import ZaiJianFace from '@/components/character/ZaiJianFace'
import { colors } from '@/lib/design-system'
import type { ZaiJianExpression, ZaiJianLine } from '@/lib/copy/zaijian'

export type ZaiJianSize = 'xs' | 'sm' | 'md' | 'lg' | 'hero'

const SIZES: Record<ZaiJianSize, number> = {
  xs: 28,
  sm: 40,
  md: 56,
  lg: 80,
  hero: 120,
}

interface Props {
  expression?: ZaiJianExpression
  size?: ZaiJianSize
  line?: ZaiJianLine | null
  layout?: 'inline' | 'stack' | 'bubble'
  breathe?: boolean
  className?: string
}

export default function ZaiJian({
  expression = 'normal',
  size = 'md',
  line,
  layout = 'stack',
  breathe = false,
  className = '',
}: Props) {
  const px = SIZES[size]
  const expr = line?.expression ?? expression

  const face = (
    <div
      className={`flex-shrink-0 ${breathe ? 'mi-breathe-ring' : ''}`}
      style={{ width: px, height: px }}
    >
      <ZaiJianFace expression={expr} className="w-full h-full" />
    </div>
  )

  if (!line) {
    return <div className={className}>{face}</div>
  }

  if (layout === 'inline') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {face}
        <div className="min-w-0">
          <p className="text-[15px] font-medium leading-snug" style={{ color: colors.text.primary }}>
            {line.text}
          </p>
          {line.subtext && (
            <p className="text-[13px] mt-0.5 leading-relaxed" style={{ color: colors.text.secondary }}>
              {line.subtext}
            </p>
          )}
        </div>
      </div>
    )
  }

  if (layout === 'bubble') {
    return (
      <div className={`flex items-start gap-3 ${className}`}>
        {face}
        <div
          className="flex-1 rounded-2xl px-4 py-3"
          style={{ backgroundColor: colors.bg.muted, border: `1px solid ${colors.border.subtle}` }}
        >
          <p className="text-[15px] font-medium leading-snug" style={{ color: colors.text.primary }}>
            {line.text}
          </p>
          {line.subtext && (
            <p className="text-[13px] mt-1 leading-relaxed" style={{ color: colors.text.secondary }}>
              {line.subtext}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center text-center gap-3 ${className}`}>
      {face}
      <div>
        <p className="text-[15px] font-medium leading-snug" style={{ color: colors.text.primary }}>
          {line.text}
        </p>
        {line.subtext && (
          <p className="text-[13px] mt-1 leading-relaxed" style={{ color: colors.text.secondary }}>
            {line.subtext}
          </p>
        )}
      </div>
    </div>
  )
}
