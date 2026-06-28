/** Cross-tab Today actions (photo / text log) — used by BottomNav + TodayOS. */

export const TODAY_OPEN_PHOTO_EVENT = 'betterbit:open-photo'
export const TODAY_OPEN_TEXT_LOG_EVENT = 'betterbit:open-text-log'

export type TodaySheetIntent = 'photo' | 'text'

export function todaySheetFromSearch(search: string): TodaySheetIntent | null {
  const params = new URLSearchParams(search)
  if (params.get('photo') === '1') return 'photo'
  if (params.get('text') === '1') return 'text'
  return null
}

export function clearTodaySheetParams(): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  url.searchParams.delete('photo')
  url.searchParams.delete('text')
  const next = `${url.pathname}${url.search}${url.hash}`
  window.history.replaceState({}, '', next || url.pathname)
}

export function dispatchOpenPhotoSheet(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(TODAY_OPEN_PHOTO_EVENT))
}

export function dispatchOpenTextLogSheet(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(TODAY_OPEN_TEXT_LOG_EVENT))
}

export function setAppScrollLocked(locked: boolean): void {
  if (typeof document === 'undefined') return
  const root = document.getElementById('app-scroll-root')
  if (root) {
    root.style.overflow = locked ? 'hidden' : ''
  }
  document.body.style.overflow = locked ? 'hidden' : ''
}
