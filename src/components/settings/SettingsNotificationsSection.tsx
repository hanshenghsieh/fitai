'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { colors } from '@/lib/design-system'
import { initializeFirebase, requestNotificationPermission, listenForPushMessages } from '@/lib/firebase'
import { isWebPushSupported } from '@/lib/capacitor-native'
import SettingsSection from './SettingsSection'

export default function SettingsNotificationsSection() {
  const [supported, setSupported] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isWebPushSupported()) return

    const ok = initializeFirebase()
    setSupported(true)
    if (ok && Notification.permission === 'granted') {
      setEnabled(true)
      listenForPushMessages()
    }
  }, [])

  async function enable() {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      initializeFirebase()
      const token = await requestNotificationPermission(user.id)
      if (token) {
        setEnabled(true)
        listenForPushMessages()
        toast.message('好，需要時我會輕輕提醒你。')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!supported) return null

  return (
    <SettingsSection title="通知">
      <div className="px-4 py-4 space-y-3">
        <p className="text-[15px] leading-relaxed" style={{ color: colors.text.secondary }}>
          我們只會在你需要的時候，輕輕提醒。不轟炸、不催促。
        </p>
        {enabled ? (
          <p className="text-[13px]" style={{ color: colors.accent.sage }}>
            已開啟
          </p>
        ) : (
          <button
            type="button"
            onClick={() => void enable()}
            disabled={loading}
            className="w-full py-3 rounded-xl text-[14px] font-medium disabled:opacity-40"
            style={{ backgroundColor: colors.bg.muted, color: colors.text.secondary }}
          >
            {loading ? '設定中…' : '開啟提醒'}
          </button>
        )}
      </div>
    </SettingsSection>
  )
}
