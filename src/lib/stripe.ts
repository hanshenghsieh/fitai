import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18' as const,
})

export const SUBSCRIPTION_PLANS = {
  monthly: {
    name: '再健一點 月付方案',
    amount: 50000, // $500 台幣，單位為最小單位（分）
    currency: 'twd',
    interval: 'month' as const,
    description: '每月 500 台幣，達標 20 天以上享下月免費升級',
  },
}

export async function createCustomerIfNotExists(
  userId: string,
  email: string,
  name?: string
): Promise<string> {
  // 檢查是否已存在 Stripe customer
  const customers = await stripe.customers.list({
    email,
    limit: 1,
  })

  if (customers.data.length > 0) {
    return customers.data[0].id
  }

  // 建立新 customer
  const customer = await stripe.customers.create({
    email,
    name: name || email,
    metadata: {
      user_id: userId,
    },
  })

  return customer.id
}

export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  userId: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: { user_id: userId },
    },
    metadata: { user_id: userId },
  })
}

export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return stripe.subscriptions.retrieve(subscriptionId)
}

export async function cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  })
}

export async function updateSubscriptionItem(
  subscriptionId: string,
  subscriptionItemId: string,
  priceId: string
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.update(subscriptionId, {
    items: [{
      id: subscriptionItemId,
      price: priceId,
    }],
  })
}
