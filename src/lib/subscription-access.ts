import { differenceInDays } from 'date-fns'

export const TRIAL_DAYS = 7

export interface AccessStatus {
  hasFullAccess: boolean
  isTrial: boolean
  isSubscribed: boolean
  trialDaysLeft: number
  trialExpired: boolean
}

export function getAccessStatus(
  profileCreatedAt: string,
  subscription: { status: string } | null
): AccessStatus {
  const daysSince = differenceInDays(new Date(), new Date(profileCreatedAt))
  const isSubscribed = subscription?.status === 'active'
  const trialDaysLeft = Math.max(0, TRIAL_DAYS - daysSince)
  const isTrial = !isSubscribed && daysSince < TRIAL_DAYS
  const trialExpired = !isSubscribed && daysSince >= TRIAL_DAYS
  const hasFullAccess = isSubscribed || isTrial

  return { hasFullAccess, isTrial, isSubscribed, trialDaysLeft, trialExpired }
}
