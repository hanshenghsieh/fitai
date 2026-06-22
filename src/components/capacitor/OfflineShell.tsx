'use client'

import { useEffect, useState } from 'react'
import { TODAY } from '@/lib/today-design'

export default function OfflineShell() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    const sync = () => setOffline(typeof navigator !== 'undefined' && !navigator.onLine)
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  if (!offline) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-8 text-center safe-area-pb"
      style={{ backgroundColor: TODAY.bg, fontFamily: TODAY.font }}
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
        className="mt-8 h-12 px-8 rounded-[20px] text-[15px]"
        style={{ backgroundColor: TODAY.mocha, color: '#FFFFFF', fontWeight: 500 }}
      >
        重試
      </button>
    </div>
  )
}
