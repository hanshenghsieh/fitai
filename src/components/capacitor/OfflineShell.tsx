'use client'

import { useEffect, useState } from 'react'
import { TODAY } from '@/lib/today-design'
import { hasTodayOfflineSnapshot } from '@/lib/today-offline-cache'
import { hasPendingSync, isOffline } from '@/lib/offline-pending-sync'

export default function OfflineShell() {
  const [offline, setOffline] = useState(false)
  const [hasCache, setHasCache] = useState(false)
  const [pendingSync, setPendingSync] = useState(false)

  useEffect(() => {
    const sync = () => {
      const nextOffline = isOffline()
      setOffline(nextOffline)
      setHasCache(hasTodayOfflineSnapshot())
      setPendingSync(hasPendingSync())
    }
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    window.addEventListener('storage', sync)
    window.addEventListener('bb-pending-sync', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
      window.removeEventListener('storage', sync)
      window.removeEventListener('bb-pending-sync', sync)
    }
  }, [])

  if (!offline && !pendingSync) return null

  if (hasCache || pendingSync) {
    return (
      <div
        className="fixed inset-x-0 top-0 z-[100] px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3"
        style={{ pointerEvents: 'none' }}
        aria-live="polite"
        role="status"
      >
        <div
          className="mx-auto max-w-lg rounded-2xl px-4 py-3 text-center shadow-sm"
          style={{
            backgroundColor: TODAY.card,
            border: `1px solid ${TODAY.pillBg}`,
            fontFamily: TODAY.font,
          }}
        >
          <p className="text-[13px]" style={{ color: TODAY.text, fontWeight: 600 }}>
            {offline ? '離線模式' : '待同步'}
          </p>
          <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
            {offline
              ? pendingSync
                ? '紀錄已暫存，恢復連線後會自動同步。'
                : '顯示上次同步的今日紀錄。恢復連線後會自動更新。'
              : '有未同步的紀錄，正在背景更新…'}
          </p>
        </div>
      </div>
    )
  }

  if (!offline) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-8 text-center safe-area-pb"
      style={{ backgroundColor: TODAY.bg, fontFamily: TODAY.font }}
      role="alert"
      aria-live="assertive"
    >
      <p className="text-[20px] mb-3" style={{ color: TODAY.text, fontWeight: 600 }}>
        目前離線
      </p>
      <p className="text-[15px] leading-relaxed max-w-xs" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
        再健一點需要網路才能載入你的計畫。請確認連線後再試。
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-8 h-12 min-h-[44px] px-8 rounded-[20px] text-[15px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ backgroundColor: TODAY.mocha, color: '#FFFFFF', fontWeight: 500 }}
      >
        重試
      </button>
    </div>
  )
}
