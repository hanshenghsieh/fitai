'use client'

import { colors } from '@/lib/design-system'
import type { ZaiJianExpression, ZaiJianLine } from '@/lib/copy/zaijian'
import ZaiJianFace from '@/components/character/ZaiJianFace'

export type ZaiJianSize = 'xs' | 'sm' | 'md' | 'lg' | 'hero'

const SIZES: Record<ZaiJianSize, number> = {
  xs: 24,
  sm: 32,
  md: 48,
  lg: 64,
  hero: 88,
}

interface Props {
  expression?: ZaiJianExpression
  size?: ZaiJianSize
  line?: ZaiJianLine | null
  layout?: 'inline' | 'stack' | 'bubble' | 'whisper'
  /** 預設 false — 再健 80% 時間只留文字 */
  showFace?: boolean
  breathe?: boolean
  className?: string
}

export default function ZaiJian({
  expression = 'normal',
  size = 'sm',
  line,
  layout = 'whisper',
  showFace = false,
  breathe = false,
  className = '',
}: Props) {
  const px = SIZES[size]
  const resolvedLayout = line ? layout : 'stack'

  const face = showFace ? (
    <div
      className={`flex-shrink-0 ${breathe ? 'mi-breathe-ring' : ''}`}
      style={{ width: px, height: px }}
    >
      <ZaiJianFace expression={expression} className="w-full h-full" />
    </div>
  ) : null

  if (!line) {
    return face ? <div className={className}>{face}</div> : null
  }

  const textBlock = (
    <div className="min-w-0">
      <p className="text-[15px] font-medium leading-relaxed" style={{ color: colors.text.primary }}>
        {line.text}
      </p>
      {line.subtext && (
        <p className="text-[13px] mt-1 leading-relaxed" style={{ color: colors.text.secondary }}>
          {line.subtext}
        </p>
      )}
    </div>
  )

  if (resolvedLayout === 'whisper') {
    return <div className={`${className}`}>{textBlock}</div>
  }

  if (resolvedLayout === 'inline') {
    return (
      <div className={`flex items-start gap-3 ${className}`}>
        {face}
        {textBlock}
      </div>
    )
  }

  if (resolvedLayout === 'bubble') {
    return (
      <div className={`flex items-start gap-3 ${className}`}>
        {face}
        <div
          className="flex-1 px-4 py-3"
          style={{
            backgroundColor: colors.bg.muted,
            border: `1px solid ${colors.border.subtle}`,
            borderRadius: 16,
          }}
        >
          {textBlock}
        </div>
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center text-center gap-3 ${className}`}>
      {face}
      {textBlock}
    </div>
  )
}
