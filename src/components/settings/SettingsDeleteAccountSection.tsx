'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { colors } from '@/lib/design-system'
import { GENTLE_ERROR_MESSAGE } from '@/lib/copy/gentle-errors'
import SettingsSection from './SettingsSection'
import SettingsRow from './SettingsRow'

export default function SettingsDeleteAccountSection() {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  async function handleDeleteAccount() {
    setDeleting(true)
    try {
      const res = await fetch('/api/delete-account', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(typeof data.error === 'string' ? data.error : GENTLE_ERROR_MESSAGE)
      }

      const supabase = createClient()
      await supabase.auth.signOut()
      toast.message('帳號已刪除')
      router.push('/')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : GENTLE_ERROR_MESSAGE)
    } finally {
      setDeleting(false)
      setConfirmOpen(false)
    }
  }

  return (
    <>
      <SettingsSection title="危險區域">
        <SettingsRow
          label="刪除帳號"
          detail="永久刪除所有資料，無法復原。"
          onClick={() => setConfirmOpen(true)}
          last
        />
      </SettingsSection>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center px-5 pb-8"
          style={{ backgroundColor: 'rgba(47, 36, 29, 0.22)', backdropFilter: 'blur(4px)' }}
          onClick={() => !deleting && setConfirmOpen(false)}
        >
          <div
            className="w-full max-w-md p-6 space-y-5 rounded-2xl"
            style={{ backgroundColor: colors.bg.elevated, border: `1px solid ${colors.border.subtle}` }}
            onClick={e => e.stopPropagation()}
          >
            <div className="space-y-2">
              <p className="text-[17px] font-medium" style={{ color: colors.text.primary }}>
                確定要刪除帳號？
              </p>
              <p className="text-[14px] leading-relaxed" style={{ color: colors.text.secondary }}>
                這會永久刪除你的個人資料、飲食與運動紀錄、計畫、訂閱資料。此操作無法復原。
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setConfirmOpen(false)}
                className="flex-1 py-3 rounded-xl text-[15px] font-medium disabled:opacity-40"
                style={{ backgroundColor: colors.bg.muted, color: colors.text.primary }}
              >
                取消
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleDeleteAccount()}
                className="flex-1 py-3 rounded-xl text-[15px] font-medium disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ backgroundColor: colors.state.error, color: '#FFFDF9' }}
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : '永久刪除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
