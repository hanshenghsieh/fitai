'use client'

import { useEffect, useState } from 'react'
import { TODAY } from '@/lib/today-design'
import { hasTodayOfflineSnapshot } from '@/lib/today-offline-cache'
import { isOffline } from '@/lib/offline-pending-sync'

export default function OfflineShell() {
  const [offline, setOffline] = useState(false)
  const [hasCache, setHasCache] = useState(false)

  useEffect(() => {
    const sync = () => {
      setOffline(isOffline())
      setHasCache(hasTodayOfflineSnapshot())
    }
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  // Only surface something when actually offline. Background sync while online
  // stays low-key (handled by the small "同步中…" pill), so we never imply a
  // full offline write queue that isn't built yet.
  if (!offline) return null

  if (hasCache) {
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
            目前離線，先顯示上次資料
          </p>
          <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: TODAY.textSecondary, fontWeight: 400 }}>
            連線後會自動更新。
          </p>
        </div>
      </div>
    )
  }

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
