'use client'

import { useEffect, useState } from 'react'
import { Activity, Moon, Loader2 } from 'lucide-react'
import { colors, cardStyle } from '@/lib/design-system'
import {
  fetchPassiveHealth,
  getHealthSyncPreference,
  healthSyncAvailable,
  setHealthSyncPreference,
} from '@/lib/health-sync'
import { toast } from 'sonner'

export default function HealthSyncCard() {
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [snapshot, setSnapshot] = useState<{ steps?: number; sleep?: number } | null>(null)

  useEffect(() => {
    setEnabled(getHealthSyncPreference())
    setLoading(false)
  }, [])

  async function toggle(on: boolean) {
    setEnabled(on)
    setHealthSyncPreference(on)
    if (!on) {
      setSnapshot(null)
      toast.message('已關閉被動同步')
      return
    }
    setSyncing(true)
    try {
      const data = await fetchPassiveHealth()
      if (data) {
        setSnapshot({ steps: data.stepsToday, sleep: data.sleepHoursLastNight })
        toast.success('已開啟。有資料時會自動調整建議。')
      } else {
        toast.message('已排隊。Apple Health / Health Connect 連線即將開放。')
      }
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="rounded-2xl p-4 space-y-3" style={cardStyle}>
      <h3 className="text-[15px] font-semibold" style={{ color: colors.text.primary }}>
        被動健康資料
      </h3>
      <p className="text-[12px] leading-relaxed" style={{ color: colors.text.tertiary }}>
        步數、睡眠可幫你推斷睡眠債與運動量。不想手動記就開這個。
        {!healthSyncAvailable() && ' （連線功能陸續開放）'}
      </p>
      <div className="flex gap-2">
        {(['off', 'on'] as const).map(mode => {
          const active = mode === 'on' ? enabled : !enabled
          return (
            <button
              key={mode}
              type="button"
              disabled={loading || syncing}
              onClick={() => toggle(mode === 'on')}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold disabled:opacity-40"
              style={{
                backgroundColor: active ? colors.accent.action : colors.bg.muted,
                color: active ? '#FFFDF9' : colors.text.secondary,
              }}
            >
              {syncing && mode === 'on' ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : mode === 'on' ? '開啟' : '關閉'}
            </button>
          )
        })}
      </div>
      {enabled && snapshot && (
        <div className="flex gap-4 text-[12px]" style={{ color: colors.text.secondary }}>
          {snapshot.steps != null && (
            <span className="flex items-center gap-1">
              <Activity className="h-3.5 w-3.5" /> 今日 {snapshot.steps} 步
            </span>
          )}
          {snapshot.sleep != null && (
            <span className="flex items-center gap-1">
              <Moon className="h-3.5 w-3.5" /> 昨晚 {snapshot.sleep}h 睡眠
            </span>
          )}
        </div>
      )}
    </div>
  )
}
