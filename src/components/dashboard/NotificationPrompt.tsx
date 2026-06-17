'use client'

import { useState, useEffect } from 'react'
import { Bell, X } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { initializeFirebase, requestNotificationPermission, listenForPushMessages } from '@/lib/firebase'

export default function NotificationPrompt() {
  const [isSupported, setIsSupported] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    const checkSupport = async () => {
      const supported = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
      setIsSupported(supported)

      if (supported) {
        // Check localStorage for dismissed status (today only)
        const today = new Date().toISOString().split('T')[0]
        const savedDate = localStorage.getItem('notif_dismissed_date')
        const wasDismissedToday = savedDate === today

        if (Notification.permission === 'granted') {
          setIsEnabled(true)
          listenForPushMessages()
        } else if (!wasDismissedToday) {
          setShowPrompt(true)
        }
      }
    }

    checkSupport()
  }, [])

  if (!isSupported || isEnabled || isDismissed || !showPrompt) return null

  async function handleEnableNotifications() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('請先登入')
        return
      }

      initializeFirebase()
      const token = await requestNotificationPermission(user.id)

      if (token) {
        setIsEnabled(true)
        listenForPushMessages()
        toast.success('🔔 推播已啟用！')
      } else {
        toast.error('無法啟用推播，請檢查瀏覽器設定')
      }
    } catch (err) {
      console.error('Error enabling notifications:', err)
      toast.error('啟用推播失敗')
    }
  }

  return (
    <div className="fixed top-0 left-0 right-0 max-w-lg mx-auto bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3 flex items-center gap-3 z-50 shadow-lg">
      <Bell className="h-5 w-5 flex-shrink-0" />
      <div className="flex-1">
        <p className="font-medium text-sm">啟用推播通知？</p>
        <p className="text-xs text-blue-100">不會錯過早中晚餐和運動提醒</p>
      </div>
      <button
        onClick={handleEnableNotifications}
        className="px-3 py-1 bg-white text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-50 transition-colors flex-shrink-0"
      >
        啟用
      </button>
      <button
        onClick={() => {
          const today = new Date().toISOString().split('T')[0]
          localStorage.setItem('notif_dismissed_date', today)
          setIsDismissed(true)
        }}
        className="text-blue-100 hover:text-white flex-shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
