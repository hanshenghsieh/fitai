'use client'

import { colors } from '@/lib/design-system'
import { TRIAL_DAYS, type AccessStatus } from '@/lib/subscription-access'

interface Props {
  access: AccessStatus
}

/** D1–D14 early win — 不談瘦幾公斤，談少煩幾次 */
export default function TrialProgressCard({ access }: Props) {
  if (!access.isTrial) return null

  const daysUsed = TRIAL_DAYS - access.trialDaysLeft

  let body = `還有 ${access.trialDaysLeft} 天。不用完美，有記錄我就幫你調。`

  if (daysUsed >= 1 && daysUsed < 3) {
    body = '第一天不用全對。骰子或「常吃」一鍵就好 — 這就是 mini-win。'
  }
  if (daysUsed >= 3 && daysUsed < 7) {
    body = '前三天不容易。兩週內體重不一定動 — 少煩幾次吃什麼就算贏。'
  }
  if (daysUsed >= 7 && access.trialDaysLeft > 3) {
    body = '一週了。不用每天量體重；有在記、有在問，我就會幫你調。'
  }
  if (access.trialDaysLeft <= 3) {
    body = '還沒瘦也正常。若這 14 天少煩了幾次，就值得考慮繼續。'
  }

  return (
    <div
      className="mx-5 mt-4 px-4 py-3.5"
      style={{
        backgroundColor: colors.bg.muted,
        border: `1px solid ${colors.border.subtle}`,
        borderRadius: 16,
      }}
    >
      <p className="text-[13px] leading-relaxed" style={{ color: colors.text.secondary }}>
        {body}
      </p>
    </div>
  )
}
