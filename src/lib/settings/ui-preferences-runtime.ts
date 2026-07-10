import type { UiSettings } from '@/lib/settings/user-settings-types'

const STORAGE_KEY = 'betterbit:ui-prefs'

export function applyUiPreferencesRuntime(ui: Pick<UiSettings, 'reduced_motion' | 'animations_enabled'>): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.setAttribute('data-betterbit-reduced-motion', ui.reduced_motion ? 'true' : 'false')
  root.setAttribute('data-betterbit-no-animations', ui.animations_enabled === false ? 'true' : 'false')
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ui))
  } catch {
    /* ignore */
  }
}

export function hydrateUiPreferencesFromStorage(): void {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as Pick<UiSettings, 'reduced_motion' | 'animations_enabled'>
    applyUiPreferencesRuntime(parsed)
  } catch {
    /* ignore */
  }
}
