/** Phase 10.5 — Premium invitation copy (not paywall bullets) */

import type { AccessStatus } from '@/lib/subscription-access'

export function premiumPosture(access: AccessStatus, isSubscribed: boolean): string {
  if (isSubscribed) return '我們會一直在。'
  if (access.isTrial) return '這段時間，你有在走。'
  if (access.trialExpired) return '你留下的痕跡，還在這裡。'
  return '如果你想繼續，我們在這裡。'
}

export const PREMIUM_STORY = [
  '你已經少煩了很多次「今天吃什麼」。那不是特效，是日常的安靜。',
  '會員不是解鎖什麼。是讓計畫跟著你的生活走——亂了一週也好，回來也不用從頭開始。',
  '我們會悄悄地調整熱量、課表與節奏。你不用當自己的營養師。',
] as const

export function premiumPriceLine(): string {
  return '約每月五百。像持續的陪伴，不是一次性的工具。'
}

export function premiumTrialWhisper(access: AccessStatus): string | null {
  if (!access.isTrial || access.isSubscribed) return null
  if (access.trialDaysLeft <= 3) return '試用快告一段落了。不用趕，想清楚就好。'
  return '試用期內，你已經在這裡走了一段路。'
}
