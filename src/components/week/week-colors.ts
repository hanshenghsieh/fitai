import type { BBScoreSignal } from '@/components/icons/types'

export function weekScoreTextColor(score: number): string {
  if (score >= 80) return 'var(--bb-text-success)'
  if (score >= 60) return 'var(--bb-text-warning)'
  return 'var(--bb-text-danger)'
}

export function daySignalTextColor(signal: BBScoreSignal): string {
  if (signal === 'green') return 'var(--bb-text-success)'
  if (signal === 'yellow') return 'var(--bb-text-warning)'
  if (signal === 'red') return 'var(--bb-text-danger)'
  return 'var(--bb-text-secondary)'
}

export function daySignalSurface(signal: BBScoreSignal, isToday: boolean): string {
  if (isToday) return 'var(--bb-surface-today)'
  if (signal === 'green') return 'var(--bb-surface-success)'
  if (signal === 'yellow') return 'var(--bb-surface-warning)'
  if (signal === 'red') return 'var(--bb-surface-danger)'
  return 'var(--bb-surface-neutral)'
}

export function daySignalBorder(signal: BBScoreSignal, isToday: boolean): string {
  if (isToday) return 'var(--bb-icon-color-accent)'
  if (signal === 'green') return 'var(--bb-icon-color-success)'
  if (signal === 'yellow') return 'var(--bb-icon-color-warning)'
  if (signal === 'red') return 'var(--bb-icon-color-danger)'
  return 'var(--bb-divider-soft, rgba(0,0,0,0.08))'
}
