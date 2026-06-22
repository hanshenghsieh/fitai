'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { initializeFirebase, requestNotificationPermission, listenForPushMessages } from '@/lib/firebase'
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

      initializeFirebase()
      const token = await requestNotificationPermission(user.id)

      if (token) {
        setIsEnabled(true)
        listenForPushMessages()
        toast.success('好，我會提醒你。')
      } else {
        toast.error(GENTLE_ERROR_MESSAGE)
      }
    } catch {
      toast.error(GENTLE_ERROR_MESSAGE)
    }
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 max-w-lg mx-auto px-4 py-3 z-50 border-b"
      style={{ backgroundColor: colors.bg.elevated, borderColor: colors.border.subtle }}
    >
      <div className="flex items-start gap-3">
        <ZaiJian size="sm" line={line} layout="inline" className="flex-1 min-w-0" />
        <button
          onClick={handleEnableNotifications}
          className="px-3 py-1.5 rounded-xl text-[12px] font-semibold flex-shrink-0 mt-1"
          style={{ backgroundColor: colors.accent.action, color: '#FFFDF9' }}
        >
          好
        </button>
        <button
          onClick={() => {
            localStorage.setItem('notif_dismissed_date', new Date().toISOString().split('T')[0])
            setIsDismissed(true)
          }}
          className="flex-shrink-0 mt-1"
          style={{ color: colors.text.tertiary }}
          aria-label="關閉"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
