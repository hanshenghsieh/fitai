/** Premium / membership page copy — formal product tone */

import type { AccessStatus } from '@/lib/subscription-access'

export function premiumPosture(access: AccessStatus, isSubscribed: boolean): string {
  if (isSubscribed) return '會員方案使用中'
  return '月費 NT$500'
}

export const PREMIUM_BODY =
  '會員可使用完整的飲食追蹤、下一餐推薦、蛋白質缺口提醒、每週回顧與個人化建議，幫助你更穩定地管理外食與減脂進度。'

export const PREMIUM_FEATURES = [
  '完整飲食紀錄',
  '外食推薦',
  '熱量與蛋白質追蹤',
  '每週狀態回顧',
  '個人化建議',
  '更多推薦次數',
] as const

export const PREMIUM_SUBSCRIBED_BODY =
  '您可使用完整的飲食追蹤、下一餐推薦、每週回顧與個人化建議。'

export function premiumTrialWhisper(access: AccessStatus): string | null {
  if (!access.isTrial || access.isSubscribed) return null
  return `試用中 · 剩餘 ${access.trialDaysLeft} 天`
}
