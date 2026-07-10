/** Lightweight haptic feedback — navigator.vibrate only, no extra deps. */

type HapticKind = 'light' | 'medium' | 'success' | 'error'

const PATTERNS: Record<HapticKind, number | number[]> = {
  light: 8,
  medium: 16,
  success: [12, 40, 12],
  error: [20, 30, 20, 30, 20],
}

export function triggerV2Haptic(kind: HapticKind): void {
  if (typeof window === 'undefined') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  try {
    navigator.vibrate?.(PATTERNS[kind])
  } catch {
    /* ignore */
  }
}
