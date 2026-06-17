'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { CreditCard, Check, Loader2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SubscriptionManager() {
  const [subscription, setSubscription] = useState<any>(null)
  const [freeUpgrade, setFreeUpgrade] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [checkingUpgrade, setCheckingUpgrade] = useState(false)
  const [subscribing, setSubscribing] = useState(false)

  useEffect(() => {
    loadSubscriptionStatus()
  }, [])

  async function loadSubscriptionStatus() {
    try {
      const res = await fetch('/api/get-subscription')
      if (res.ok) {
        const data = await res.json()
        setSubscription(data.subscription)
        setFreeUpgrade(data.freeUpgrade)
      }
    } catch (err) {
      console.error('Error loading subscription:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCheckFreeUpgrade() {
    setCheckingUpgrade(true)
    try {
      const res = await fetch('/api/check-free-upgrade')
      if (!res.ok) throw new Error()
      const data = await res.json()

      if (data.success) {
        toast.success(data.message)
        loadSubscriptionStatus()
      } else {
        toast.info(data.message)
      }
    } catch {
      toast.error('檢查失敗，請稍後再試')
    } finally {
      setCheckingUpgrade(false)
    }
  }

  async function handleSubscribe() {
    setSubscribing(true)
    try {
      const res = await fetch('/api/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || 'price_1234567890',
        }),
      })

      if (!res.ok) throw new Error('Failed to create subscription')

      const data = await res.json()
      if (data.clientSecret) {
        // 重定向到 Stripe Checkout
        window.location.href = `https://checkout.stripe.com/pay/${data.clientSecret}`
      } else {
        toast.error('無法初始化支付')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '訂閱失敗')
    } finally {
      setSubscribing(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-4 text-center">
        <Loader2 className="h-5 w-5 animate-spin mx-auto text-emerald-500" />
      </div>
    )
  }

  const isSubscribed = subscription?.status === 'active'
  const completedDays = freeUpgrade?.completedDays || 0

  return (
    <div className="space-y-3">
      {/* Subscription status */}
      {isSubscribed ? (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Check className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-emerald-700">已訂閱</h3>
              <p className="text-sm text-emerald-600 mt-1">月費 NT$500</p>
              {subscription?.current_period_end && (
                <p className="text-xs text-emerald-500 mt-1">
                  下次結算：{new Date(subscription.current_period_end).toLocaleDateString('zh-TW')}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <CreditCard className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-blue-700">尚未訂閱</h3>
              <p className="text-sm text-blue-600 mt-1">月費 NT$500，完成 20 天達標自動免費升級</p>
              <Button
                onClick={handleSubscribe}
                disabled={subscribing}
                className="mt-3 w-full bg-blue-600 hover:bg-blue-700"
              >
                {subscribing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                立即訂閱
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Free upgrade progress */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          <h3 className="font-bold text-gray-800">達標免費升級進度</h3>
        </div>
        <p className="text-sm text-gray-600 mb-2">
          上月達標天數：<span className="font-bold text-emerald-600">{completedDays}</span> / 20 天
        </p>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
          <div
            className="bg-yellow-400 h-2 rounded-full transition-all"
            style={{ width: `${Math.min((completedDays / 20) * 100, 100)}%` }}
          />
        </div>
        {completedDays >= 20 ? (
          <div className="text-sm text-emerald-600 font-medium">
            🎉 已達標！本月應享受免費升級
          </div>
        ) : (
          <p className="text-xs text-gray-500">
            還需 {Math.max(0, 20 - completedDays)} 天達標就能免費享用下一個月
          </p>
        )}
        <Button
          onClick={handleCheckFreeUpgrade}
          disabled={checkingUpgrade}
          variant="outline"
          className="w-full mt-3"
        >
          {checkingUpgrade ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          檢查免費升級
        </Button>
      </div>
    </div>
  )
}
