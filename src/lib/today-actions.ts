/** Cross-tab Today actions (photo / text log) — used by BottomNav + TodayOS. */

import type { FoodSlot } from '@/lib/food-slots'
import { isLocalDateKey } from '@/lib/timezone'

export const TODAY_OPEN_PHOTO_EVENT = 'betterbit:open-photo'
export const TODAY_OPEN_TEXT_LOG_EVENT = 'betterbit:open-text-log'
export const TODAY_OPEN_RECORD_SHEET_EVENT = 'betterbit:open-record-sheet'
export const TODAY_ROLL_DICE_EVENT = 'betterbit:roll-dice'
export const TODAY_CONFIRM_DICE_EVENT = 'betterbit:confirm-dice'
const PENDING_CAPTURE_CONTEXT_KEY = 'betterbit:pending-food-capture-context'

export type TodaySheetIntent = 'photo' | 'text' | 'record'
export type TargetMealSlot = 'breakfast' | 'lunch' | 'dinner' | 'late_snack' | 'snack'

export interface FoodCaptureContext {
  targetDate?: string
  targetMealSlot?: TargetMealSlot
  source?: 'record' | 'global'
}

export interface TodayActionContext extends FoodCaptureContext {
  intent: TodaySheetIntent
}

export function targetMealSlotForCaptureLabel(
  value: string | null | undefined
): TargetMealSlot | undefined {
  if (value === 'breakfast' || value === 'meal1') return 'breakfast'
  if (value === 'lunch' || value === 'meal2') return 'lunch'
  if (value === 'dinner' || value === 'meal3') return 'dinner'
  if (value === 'snack' || value === 'other') return 'snack'
  if (value === 'late_snack' || value === 'before_sleep') return 'late_snack'
  return undefined
}

export function foodSlotForCaptureLabel(value: string | null | undefined): FoodSlot | undefined {
  if (value === 'breakfast' || value === 'meal1') return 'meal1'
  if (value === 'lunch' || value === 'meal2') return 'meal2'
  if (value === 'dinner' || value === 'meal3') return 'meal3'
  if (value === 'snack' || value === 'other') return 'other'
  if (value === 'late_snack' || value === 'before_sleep') return 'before_sleep'
  return undefined
}

export function targetMealSlotForFoodSlot(slot: FoodSlot | undefined): TargetMealSlot | undefined {
  return targetMealSlotForCaptureLabel(slot)
}

export function todaySheetFromSearch(search: string): TodaySheetIntent | null {
  const params = new URLSearchParams(search)
  if (params.get('record') === '1') return 'record'
  if (params.get('photo') === '1') return 'photo'
  if (params.get('text') === '1') return 'text'
  return null
}

export function todayActionContextFromSearch(search: string): TodayActionContext | null {
  const intent = todaySheetFromSearch(search)
  if (!intent) return null
  const params = new URLSearchParams(search)
  const targetDate = params.get('targetDate')
  const targetMealSlot = targetMealSlotForCaptureLabel(
    params.get('targetMealSlot') ?? params.get('slot')
  )
  return {
    intent,
    targetDate: isLocalDateKey(targetDate) ? targetDate : undefined,
    targetMealSlot,
    source: intent === 'record' ? 'record' : 'global',
  }
}

export function recordCaptureHref(context: Required<Pick<FoodCaptureContext, 'targetDate'>> & FoodCaptureContext): string {
  const params = new URLSearchParams({ record: '1', targetDate: context.targetDate })
  if (context.targetMealSlot) params.set('targetMealSlot', context.targetMealSlot)
  return `/dashboard?${params.toString()}`
}

export function storePendingCaptureContext(context: FoodCaptureContext): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(PENDING_CAPTURE_CONTEXT_KEY, JSON.stringify(context))
}

export function takePendingCaptureContext(): FoodCaptureContext | null {
  if (typeof window === 'undefined') return null
  const raw = window.sessionStorage.getItem(PENDING_CAPTURE_CONTEXT_KEY)
  window.sessionStorage.removeItem(PENDING_CAPTURE_CONTEXT_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as FoodCaptureContext
    return {
      targetDate: isLocalDateKey(parsed.targetDate) ? parsed.targetDate : undefined,
      targetMealSlot: targetMealSlotForCaptureLabel(
        parsed.targetMealSlot ?? (parsed as { slot?: string }).slot
      ),
      source: parsed.source === 'record' ? 'record' : 'global',
    }
  } catch {
    return null
  }
}

export function clearTodaySheetParams(): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  url.searchParams.delete('record')
  url.searchParams.delete('photo')
  url.searchParams.delete('text')
  url.searchParams.delete('targetDate')
  url.searchParams.delete('targetMealSlot')
  url.searchParams.delete('slot')
  const next = `${url.pathname}${url.search}${url.hash}`
  window.history.replaceState({}, '', next || url.pathname)
}

export function dispatchOpenPhotoSheet(context?: FoodCaptureContext): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(TODAY_OPEN_PHOTO_EVENT, { detail: context }))
}

export function dispatchOpenTextLogSheet(context?: FoodCaptureContext): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(TODAY_OPEN_TEXT_LOG_EVENT, { detail: context }))
}

export function dispatchOpenRecordSheet(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(TODAY_OPEN_RECORD_SHEET_EVENT))
}

export function dispatchRollDice(context?: FoodCaptureContext): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(TODAY_ROLL_DICE_EVENT, { detail: context }))
}

export function dispatchConfirmDice(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(TODAY_CONFIRM_DICE_EVENT))
}

let appOverlayDepth = 0

export function setAppScrollLocked(locked: boolean): void {
  if (typeof document === 'undefined') return
  const root = document.getElementById('app-scroll-root')
  if (root) {
    root.style.overflow = locked ? 'hidden' : ''
  }
  document.body.style.overflow = locked ? 'hidden' : ''
}

/** Lock scroll and hide bottom nav while a full-screen overlay is open. Ref-counted for nested sheets. */
export function setAppOverlayOpen(open: boolean): void {
  if (typeof document === 'undefined') return
  appOverlayDepth = Math.max(0, appOverlayDepth + (open ? 1 : -1))
  const active = appOverlayDepth > 0
  document.documentElement.toggleAttribute('data-app-overlay', active)
  setAppScrollLocked(active)
}
