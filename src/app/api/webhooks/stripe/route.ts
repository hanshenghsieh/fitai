import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

async function resolveUserId(subscription: Stripe.Subscription): Promise<string | null> {
  if (subscription.metadata?.user_id) return subscription.metadata.user_id

  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer?.id
  if (!customerId) return null

  const customer = await stripe.customers.retrieve(customerId)
  if (!customer.deleted && customer.metadata?.user_id) {
    return customer.metadata.user_id
  }
  return null
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const supabase = createAdminClient()
  const userId = await resolveUserId(subscription)

  if (!userId) return

  const { error } = await supabase.from('subscriptions').upsert({
    user_id: userId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer as string,
    status: subscription.status,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'stripe_subscription_id' })

  if (error) console.error('Error creating subscription record:', error)
  else console.log(`✅ Subscription created for user ${userId}`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) console.error('Error updating subscription:', error)
  else console.log(`✅ Subscription updated: ${subscription.id}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) console.error('Error canceling subscription:', error)
  else console.log(`✅ Subscription canceled: ${subscription.id}`)
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log(`✅ Payment succeeded: ${paymentIntent.id}`)

  if (!paymentIntent.subscription) return

  const supabase = createAdminClient()
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', paymentIntent.subscription)
    .single()

  if (subscription) {
    await supabase.from('subscription_payments').insert({
      user_id: subscription.user_id,
      stripe_payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount / 100, // 轉換為台幣
      currency: paymentIntent.currency,
      status: 'succeeded',
    })
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.error(`❌ Payment failed: ${paymentIntent.id}`)

  if (!paymentIntent.subscription) return

  const supabase = createAdminClient()
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_subscription_id', paymentIntent.subscription)
    .single()

  if (subscription) {
    await supabase.from('subscription_payments').insert({
      user_id: subscription.user_id,
      stripe_payment_intent_id: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      status: 'failed',
    })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature') || ''

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret || '')
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error(`Webhook signature verification failed: ${message}`)
    return NextResponse.json({ error: message }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.subscription && session.metadata?.user_id) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string)
          await handleSubscriptionCreated(sub)
        }
        break
      }

      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
        console.log(`Invoice event: ${event.type}`)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('Error handling webhook:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
