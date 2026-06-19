/** Stripe 生產設定 — 單一來源 */

export function getStripePriceId(): string {
  const id = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || process.env.STRIPE_PRICE_ID
  if (!id || id === 'price_1234567890') {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[Stripe] NEXT_PUBLIC_STRIPE_PRICE_ID not set — subscription disabled')
    }
    return ''
  }
  return id
}

export function isStripeConfigured(): boolean {
  return !!(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_WEBHOOK_SECRET &&
    getStripePriceId()
  )
}

export const SUBSCRIPTION_PRICE_LABEL = 'NT$500/月'
