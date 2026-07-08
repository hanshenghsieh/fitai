/** Premium / membership page copy — formal product tone */

import type { AccessStatus } from '@/lib/subscription-access'
import { SUBSCRIPTION_PRICE_LABEL } from '@/lib/stripe-config'

export function premiumPosture(access: AccessStatus, isSubscribed: boolean): string {
  if (isSubscribed) return 'BetterBit Pro 使用中'
  return SUBSCRIPTION_PRICE_LABEL
}

export const PREMIUM_SUBTITLE_SUBSCRIBED = '你已解鎖完整減脂工具。'

export const PREMIUM_BODY =
  'BetterBit Pro 幫你把外食選擇算清楚——完整飲食記錄、AI 下一餐推薦、每週分析與熱量銀行，陪你穩定減脂。'

export const PREMIUM_FEATURES = [
  '無限飲食記錄',
  '拍照估算熱量',
  'AI 下一餐推薦',
  '每週飲食分析',
  '熱量銀行',
  '台灣外食資料庫',
  '餐點修正與資料來源標示',
] as const

export const PREMIUM_SUBSCRIBED_BODY = PREMIUM_SUBTITLE_SUBSCRIBED

export const PREMIUM_MANAGE_FOOTNOTE =
  '可隨時在 App Store 或帳號設定中管理訂閱。'

export const PREMIUM_MANAGE_FOOTNOTE_WEB = '可隨時在帳號設定中管理訂閱。'

export const PREMIUM_TESTFLIGHT_SUBTITLE = '封測期間開放完整功能'

export const PREMIUM_TESTFLIGHT_BODY =
  '此 TestFlight 版本已開放完整會員功能，供測試人員體驗飲食紀錄、下一餐推薦、熱量與蛋白質追蹤、每週回顧與個人化建議。'

export const PREMIUM_TESTFLIGHT_FEATURES = PREMIUM_FEATURES

export const PREMIUM_TESTFLIGHT_FOOTNOTE =
  '若此畫面仍顯示封測說明，代表 App Store 訂閱開關尚未開啟。正式審核版請使用 App Store 訂閱。'

export function premiumTrialWhisper(access: AccessStatus): string | null {
  if (!access.isTrial || access.isSubscribed) return null
  return `試用中 · 剩餘 ${access.trialDaysLeft} 天`
}
