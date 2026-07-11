'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import { clearUserLocalState } from '@/lib/clear-user-local-state'

export default function V2SettingsLogoutButton() {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      clearUserLocalState()
      await supabase.auth.signOut()
      clearUserLocalState()
      router.push('/login')
      router.refresh()
    } finally {
      setLoading(false)
      setConfirmOpen(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="v2-settings-logout w-full min-h-[48px] rounded-[24px] flex items-center justify-center gap-2 touch-manipulation v2-settings-stagger"
        style={{
          backgroundColor: BB_V2.bg.softGreen,
          border: `1px solid ${BB_V2.accent.greenSoftBorder}`,
          color: BB_V2.accent.green,
          fontWeight: 600,
          fontSize: 15,
        }}
      >
        <LogOut className="h-4 w-4" strokeWidth={BB_V2.iconStroke} />
        登出帳號
      </button>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center px-5 pb-[max(env(safe-area-inset-bottom),24px)]"
          style={{ backgroundColor: 'rgba(18, 61, 36, 0.18)', backdropFilter: 'blur(4px)' }}
          onClick={() => !loading && setConfirmOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-md p-6 space-y-5 rounded-[28px]"
            style={{ backgroundColor: BB_V2.bg.card, border: `1px solid ${BB_V2.border}`, boxShadow: BB_V2.shadow.card }}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
          >
            <div className="space-y-2 text-center">
              <p id="logout-confirm-title" className="text-[18px]" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
                確認登出？
              </p>
              <p className="text-[14px] leading-relaxed" style={{ color: BB_V2.text.secondary }}>
                你可以隨時重新登入 Betterbit。
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={loading}
                onClick={() => setConfirmOpen(false)}
                className="flex-1 py-3 rounded-[20px] text-[15px] disabled:opacity-40"
                style={{ backgroundColor: BB_V2.bg.pill, color: BB_V2.text.primary, fontWeight: 600 }}
              >
                取消
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleLogout()}
                className="flex-1 py-3 rounded-[20px] text-[15px] disabled:opacity-40"
                style={{ backgroundColor: BB_V2.accent.green, color: '#fff', fontWeight: 600 }}
              >
                {loading ? '登出中…' : '登出'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
