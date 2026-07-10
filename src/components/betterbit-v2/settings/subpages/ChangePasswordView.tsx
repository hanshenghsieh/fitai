'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import type { SettingsBundle } from '@/lib/app/settings-data'
import { useSettingsDirtyTracker } from '@/hooks/useSettingsForm'
import {
  SETTINGS_SAVE_ERROR,
  SETTINGS_SAVE_SUCCESS,
  SETTINGS_SAVING_LABEL,
} from '@/lib/settings/settings-form-messages'
import { BB_V2 } from '@/lib/betterbit-v2'
import V2SettingsSubpageShell from './V2SettingsSubpageShell'
import V2SettingsFormCard from './V2SettingsFormCard'
import V2SettingsField, { V2SettingsInput } from './V2SettingsField'
import { apiFetch } from '@/lib/api/client'

export default function ChangePasswordView({ initial }: { initial: SettingsBundle }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const formSnapshot = { current, next, confirm }
  const { isDirty, markSaved } = useSettingsDirtyTracker(formSnapshot)
  const isOAuth = initial.authProvider === 'oauth'

  async function handleSave() {
    setError(null)
    if (!current || !next || !confirm) {
      toast.error('請填寫所有密碼欄位')
      return
    }
    if (next.length < 8) {
      const msg = '新密碼至少需要 8 個字元'
      setError(msg)
      toast.error(msg)
      return
    }
    if (next === current) {
      const msg = '新密碼不可與目前密碼相同'
      setError(msg)
      toast.error(msg)
      return
    }
    if (next !== confirm) {
      const msg = '兩次輸入的新密碼不一致'
      setError(msg)
      toast.error(msg)
      return
    }

    setSaving(true)
    try {
      const res = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: current, new_password: next, confirm_password: confirm }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '密碼更新失敗，請稍後再試')
      setCurrent('')
      setNext('')
      setConfirm('')
      markSaved({ current: '', next: '', confirm: '' })
      toast.success(SETTINGS_SAVE_SUCCESS)
    } catch (err) {
      const msg = err instanceof Error ? err.message : SETTINGS_SAVE_ERROR
      setError(msg)
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  if (isOAuth) {
    return (
      <V2SettingsSubpageShell title="變更密碼" subtitle="你的帳號使用 Apple 登入，密碼需至 Apple ID 管理。" backHref="/settings/profile">
        <V2SettingsFormCard>
          <p className="text-[14px] leading-relaxed" style={{ color: BB_V2.text.secondary }}>
            若你使用 Apple 登入，請至 Apple ID 管理頁面更新密碼與安全設定。
          </p>
        </V2SettingsFormCard>
      </V2SettingsSubpageShell>
    )
  }

  return (
    <V2SettingsSubpageShell
      title="變更密碼"
      subtitle="為了保護你的帳號，請設定一組安全的新密碼。"
      backHref="/settings/profile"
      saveLabel={saving ? SETTINGS_SAVING_LABEL : '更新密碼'}
      onSave={handleSave}
      saving={saving}
      saveDisabled={!isDirty}
      isDirty={isDirty}
    >
      <V2SettingsFormCard>
        <V2SettingsField label="目前密碼" error={error ?? undefined}>
          <V2SettingsInput type="password" value={current} onChange={setCurrent} placeholder="輸入目前使用的密碼" autoComplete="current-password" />
        </V2SettingsField>
        <V2SettingsField label="新密碼" helper="至少 8 個字元，建議包含英文與數字">
          <V2SettingsInput type="password" value={next} onChange={setNext} autoComplete="new-password" />
        </V2SettingsField>
        <V2SettingsField label="確認新密碼">
          <V2SettingsInput type="password" value={confirm} onChange={setConfirm} placeholder="再次輸入新密碼" autoComplete="new-password" />
        </V2SettingsField>
      </V2SettingsFormCard>
    </V2SettingsSubpageShell>
  )
}
