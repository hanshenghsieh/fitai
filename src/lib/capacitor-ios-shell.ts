import { isNativeIOS } from '@/lib/capacitor-native'

const CANVAS = '#FFF9F2'
const VIEWPORT_CONTENT =
  'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'

/** WKWebView often reports env(safe-area-inset-*) as 0 when native scroll insets are negated. */
const IOS_SAFE_TOP_FALLBACK = 47
const IOS_SAFE_BOTTOM_FALLBACK = 34

function readEnvInset(side: 'Top' | 'Bottom' | 'Left' | 'Right'): number {
  const probe = document.createElement('div')
  probe.style.cssText =
    'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);'
  document.body.appendChild(probe)
  const value = parseFloat(getComputedStyle(probe)[`padding${side}` as 'paddingTop']) || 0
  probe.remove()
  return value
}

function iosSafeTopFallback(): number {
  if (typeof window === 'undefined') return IOS_SAFE_TOP_FALLBACK
  const h = window.screen.height
  // Tall iPhones (notch / Dynamic Island)
  if (h >= 812) return IOS_SAFE_TOP_FALLBACK
  // Classic status bar
  return 20
}

function resolveSafeInsets(): { top: number; bottom: number } {
  let top = readEnvInset('Top')
  let bottom = readEnvInset('Bottom')

  const onIos =
    isNativeIOS() ||
    (typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent))

  if (onIos) {
    if (top < 20) top = iosSafeTopFallback()
    if (bottom < 8) bottom = IOS_SAFE_BOTTOM_FALLBACK
  }

  return {
    top: Math.min(top, 59),
    bottom: Math.min(bottom, 40),
  }
}

function applySafeAreaVariables(): void {
  const html = document.documentElement
  const { top, bottom } = resolveSafeInsets()

  html.style.setProperty('--app-safe-top', `${top}px`)
  html.style.setProperty('--app-safe-bottom', `${bottom}px`)
}

export function remeasureCapacitorSafeAreas(): void {
  if (typeof document === 'undefined') return
  const onIos =
    isNativeIOS() ||
    /iPhone|iPad|iPod/i.test(navigator.userAgent)
  if (!onIos) return
  applySafeAreaVariables()
}

/** iOS WebView shell: canvas background, viewport lock, block pinch zoom. */
export function installCapacitorIOSShell(): () => void {
  if (typeof document === 'undefined') return () => {}

  const onIos =
    isNativeIOS() ||
    /iPhone|iPad|iPod/i.test(navigator.userAgent)

  if (!onIos) return () => {}

  const html = document.documentElement
  html.classList.add('capacitor-ios')
  html.style.backgroundColor = CANVAS
  html.style.height = '100%'
  html.style.overflow = 'hidden'
  document.body.style.backgroundColor = CANVAS
  document.body.style.height = '100%'
  document.body.style.overflow = 'hidden'

  let meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'viewport'
    document.head.appendChild(meta)
  }
  meta.content = VIEWPORT_CONTENT

  applySafeAreaVariables()
  const onViewportChange = () => applySafeAreaVariables()
  window.visualViewport?.addEventListener('resize', onViewportChange)
  window.visualViewport?.addEventListener('scroll', onViewportChange)

  const blockGesture = (e: Event) => e.preventDefault()
  document.addEventListener('gesturestart', blockGesture, { passive: false })
  document.addEventListener('gesturechange', blockGesture, { passive: false })
  document.addEventListener('gestureend', blockGesture, { passive: false })

  return () => {
    html.classList.remove('capacitor-ios')
    html.style.height = ''
    html.style.overflow = ''
    html.style.removeProperty('--app-safe-top')
    html.style.removeProperty('--app-safe-bottom')
    document.body.style.height = ''
    document.body.style.overflow = ''
    window.visualViewport?.removeEventListener('resize', onViewportChange)
    window.visualViewport?.removeEventListener('scroll', onViewportChange)
    document.removeEventListener('gesturestart', blockGesture)
    document.removeEventListener('gesturechange', blockGesture)
    document.removeEventListener('gestureend', blockGesture)
  }
}
