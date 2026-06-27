import { isNativeIOS } from '@/lib/capacitor-native'

const CANVAS = '#FFF9F2'
const VIEWPORT_CONTENT =
  'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'

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

  const blockGesture = (e: Event) => e.preventDefault()
  document.addEventListener('gesturestart', blockGesture, { passive: false })
  document.addEventListener('gesturechange', blockGesture, { passive: false })
  document.addEventListener('gestureend', blockGesture, { passive: false })

  return () => {
    html.classList.remove('capacitor-ios')
    html.style.height = ''
    html.style.overflow = ''
    document.body.style.height = ''
    document.body.style.overflow = ''
    document.removeEventListener('gesturestart', blockGesture)
    document.removeEventListener('gesturechange', blockGesture)
    document.removeEventListener('gestureend', blockGesture)
  }
}
