import { isNativeIOS } from '@/lib/capacitor-native'

const CANVAS = '#FFF9F2'
const VIEWPORT_CONTENT =
  'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'

function readEnvInset(side: 'Top' | 'Bottom' | 'Left' | 'Right'): number {
  const probe = document.createElement('div')
  probe.style.cssText =
    'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);'
  document.body.appendChild(probe)
  const value = parseFloat(getComputedStyle(probe)[`padding${side}` as 'paddingTop']) || 0
  probe.remove()
  return value
}

function applySafeAreaVariables(): void {
  const html = document.documentElement
  let top = readEnvInset('Top')
  let bottom = readEnvInset('Bottom')

  const vv = window.visualViewport
  if (vv) {
    if (top <= 0) top = Math.max(0, Math.round(vv.offsetTop))
    if (bottom <= 0) {
      bottom = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
    }
  }

  html.style.setProperty('--app-safe-top', `${top}px`)
  html.style.setProperty('--app-safe-bottom', `${bottom}px`)
}

export function remeasureCapacitorSafeAreas(): void {
  if (typeof document === 'undefined' || !isNativeIOS()) return
  applySafeAreaVariables()
}

/** iOS WebView shell: canvas background, viewport lock, block pinch zoom. */
export function installCapacitorIOSShell(): () => void {
  if (typeof document === 'undefined' || !isNativeIOS()) return () => {}

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
