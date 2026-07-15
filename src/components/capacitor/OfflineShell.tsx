'use client'

import { useEffect, useState } from 'react'
import { TODAY } from '@/lib/today-design'
import { hasTodayOfflineSnapshot } from '@/lib/today-offline-cache'
import { isOffline } from '@/lib/offline-pending-sync'
import { createClient } from '@/lib/supabase/client'
import {
  getOfflineMutationStatusForUser,
  OFFLINE_MUTATION_EVENT,
  type OfflineMutationStatusSummary,
} from '@/lib/offline-mutation-queue'

function syncStatusLabel(status: OfflineMutationStatusSummary['status']): string | null {
  if (status === 'storage_error') return '無法安全儲存在此裝置，請保持頁面開啟'
  if (status === 'needs_attention') return '有資料尚未同步，請檢查內容後重試'
  if (status === 'auth_blocked') return '登入狀態失效，請重新登入以完成同步'
  if (status === 'failed_retryable') return '同步失敗，將稍後重試'
  if (status === 'syncing') return '同步中'
  if (status === 'pending') return '已儲存在此裝置，等待同步'
  return null
}

export default function OfflineShell() {
  const [offline, setOffline] = useState(false)
  const [hasCache, setHasCache] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [mutationStatus, setMutationStatus] = useState<OfflineMutationStatusSummary>({
    status: null,
    count: 0,
  })

  useEffect(() => {
    const supabase = createClient()
    let activeUserId: string | null = null
    const sync = () => {
      setOffline(isOffline())
      setHasCache(hasTodayOfflineSnapshot())
      setMutationStatus(getOfflineMutationStatusForUser(activeUserId))
    }
    const setActiveUser = (nextUserId: string | null) => {
      activeUserId = nextUserId
      setUserId(nextUserId)
      setMutationStatus(getOfflineMutationStatusForUser(nextUserId))
    }
    void supabase.auth.getSession().then(({ data }) => {
      setActiveUser(data.session?.user.id ?? null)
    })
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setActiveUser(session?.user.id ?? null)
    })
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    window.addEventListener('storage', sync)
    window.addEventListener(OFFLINE_MUTATION_EVENT, sync)
    return () => {
      authListener.subscription.unsubscribe()
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
      window.removeEventListener('storage', sync)
      window.removeEventListener(OFFLINE_MUTATION_EVENT, sync)
    }
  }, [])

  const statusLabel = userId ? syncStatusLabel(mutationStatus.status) : null

  if (!offline) {
    if (!statusLabel) return null
    return (
      <div
        className="fixed top-0 inset-x-0 z-[95] flex justify-center pointer-events-none pt-[max(env(safe-area-inset-top),8px)]"
        role="status"
        aria-live="polite"
      >
        <span
          className="rounded-full px-3 py-1.5 text-[12px] shadow-sm"
          style={{
            backgroundColor: TODAY.card,
            color: TODAY.textSecondary,
            border: `1px solid ${TODAY.pillBg}`,
            fontFamily: TODAY.font,
            fontWeight: 500,
          }}
        >
          {statusLabel}
        </span>
      </div>
    )
  }

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
            {statusLabel ?? '連線後會自動更新。'}
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
        Betterbit 需要網路才能載入你的計畫。請確認連線後再試。
      </p>
      {statusLabel ? (
        <p className="text-[13px] mt-3" style={{ color: TODAY.textSecondary }}>
          {statusLabel}
        </p>
      ) : null}
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
