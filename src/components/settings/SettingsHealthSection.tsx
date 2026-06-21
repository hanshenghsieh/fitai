'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { colors } from '@/lib/design-system'
import {
  fetchPassiveHealth,
  getHealthSyncPreference,
  setHealthSyncPreference,
} from '@/lib/health-sync'
import SettingsSection from './SettingsSection'

export default function SettingsHealthSection() {
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    setConnected(getHealthSyncPreference())
    setLoading(false)
  }, [])

  async function connect() {
    if (connected) return
    setSyncing(true)
    setHealthSyncPreference(true)
    setConnected(true)
    try {
      await fetchPassiveHealth()
      toast.message('已連接')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <SettingsSection title="健康資料" description="被動、安靜、自動。">
      <div className="px-4 py-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[15px] font-medium" style={{ color: colors.text.primary }}>
              Apple Health
            </p>
            <p className="text-[13px] mt-1 leading-relaxed" style={{ color: colors.text.tertiary }}>
              步數與睡眠會自動同步。你不用手動記。
            </p>
          </div>
          {connected && (
            <span className="flex items-center gap-1 text-[12px] shrink-0" style={{ color: colors.accent.sage }}>
              <Check className="h-3.5 w-3.5" /> 已連接
            </span>
          )}
        </div>
        {!connected && (
          <button
            type="button"
            disabled={loading || syncing}
            onClick={() => void connect()}
            className="w-full py-3 rounded-xl text-[14px] font-medium disabled:opacity-40"
            style={{ backgroundColor: colors.bg.muted, color: colors.text.secondary }}
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : '連接 Apple Health'}
          </button>
        )}
      </div>
    </SettingsSection>
  )
}
