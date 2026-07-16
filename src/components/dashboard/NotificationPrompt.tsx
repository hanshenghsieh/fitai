'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  isFirebaseConfigured,
  requestNotificationPermission,
  listenForPushMessages,
} from '@/lib/firebase'
import { isWebPushSupported } from '@/lib/capacitor-native'
import { colors } from '@/lib/design-system'
import { GENTLE_ERROR_MESSAGE } from '@/lib/copy/gentle-errors'
import { pickZaiJianLine } from '@/lib/copy/zaijian'
import ZaiJian from '@/components/character/ZaiJian'

export default function NotificationPrompt() {
  const [isSupported, setIsSupported] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)

  const line = pickZaiJianLine('notify_prompt')

  useEffect(() => {
    if (!isWebPushSupported()) return
    if (!isFirebaseConfigured()) return

    const supported = true
    setIsSupported(supported)

    if (supported) {
      const today = new Date().toISOString().split('T')[0]
      const wasDismissedToday = localStorage.getItem('notif_dismissed_date') === today

      if (Notification.permission === 'granted') {
        setIsEnabled(true)
        listenForPushMessages()
      } else if (!wasDismissedToday) {
        setShowPrompt(true)
      }
    }
  }, [])

  if (!isSupported || isEnabled || isDismissed || !showPrompt) return null

  async function handleEnableNotifications() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const token = await requestNotificationPermission(user.id)

      if (token) {
        setIsEnabled(true)
        listenForPushMessages()
        toast.success('好，我會提醒你。')
      } else {
        toast.message('通知服務目前無法使用，其他功能不受影響。')
      }
    } catch {
      toast.message(GENTLE_ERROR_MESSAGE)
    }
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 app-tab-column px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3 z-50 border-b"
      style={{ backgroundColor: colors.bg.elevated, borderColor: colors.border.subtle }}
    >
      <div className="flex items-start gap-3">
        <ZaiJian size="sm" line={line} layout="inline" className="flex-1 min-w-0" />
        <button
          onClick={handleEnableNotifications}
          className="px-4 py-2.5 min-h-[44px] rounded-xl text-[13px] font-semibold flex-shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ backgroundColor: colors.accent.action, color: '#FFFDF9' }}
        >
          好
        </button>
        <button
          onClick={() => {
            localStorage.setItem('notif_dismissed_date', new Date().toISOString().split('T')[0])
            setIsDismissed(true)
          }}
          className="flex-shrink-0 min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ color: colors.text.tertiary }}
          aria-label="關閉"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
