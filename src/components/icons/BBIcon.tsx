'use client'

import type { CSSProperties } from 'react'
import { BB_ICON_REGISTRY } from './registry'
import type { BBIconName, BBIconTone } from './types'

const TONE_CLASS: Record<BBIconTone, string> = {
  default: '',
  accent: 'bb-icon--accent',
  success: 'bb-icon--success',
  warning: 'bb-icon--warning',
  danger: 'bb-icon--danger',
  muted: 'bb-icon--muted',
  water: 'bb-icon--water',
}

export interface BBIconProps {
  name: BBIconName
  size?: number
  tone?: BBIconTone
  className?: string
  style?: CSSProperties
  'aria-hidden'?: boolean
  'aria-label'?: string
}

/** Apple HIG–style outline icon: 24px default, 2px stroke, theme color via CSS variables */
export default function BBIcon({
  name,
  size = 24,
  tone = 'default',
  className = '',
  style,
  'aria-hidden': ariaHidden = true,
  'aria-label': ariaLabel,
}: BBIconProps) {
  const Icon = BB_ICON_REGISTRY[name]
  const toneClass = TONE_CLASS[tone]

  return (
    <Icon
      size={size}
      strokeWidth={2}
      className={`bb-icon ${toneClass} ${className}`.trim()}
      style={{
        width: size,
        height: size,
        ...style,
      }}
      aria-hidden={ariaHidden}
      aria-label={ariaLabel}
    />
  )
}
