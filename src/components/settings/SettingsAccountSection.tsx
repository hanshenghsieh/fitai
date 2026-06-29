'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { saveBodyMeasurementForUser, validateBodyMetrics } from '@/lib/body-measurement-save'
import { toast } from 'sonner'
import { Loader2, LogOut } from 'lucide-react'
import type { UserProfile } from '@/types'
import { colors } from '@/lib/design-system'
import { GENTLE_ERROR_MESSAGE } from '@/lib/copy/gentle-errors'
import SettingsSection from './SettingsSection'
import SettingsRow from './SettingsRow'

interface Props {
  profile: UserProfile | null
  email: string
  onRegenPlan: () => void
  regenLoading: boolean
}

export default function SettingsAccountSection({
  profile,
  email,
  onRegenPlan,
  regenLoading,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [weight, setWeight] = useState(profile?.weight_kg?.toString() ?? '')
  const [bodyFat, setBodyFat] = useState(profile?.body_fat_pct?.toString() ?? '')
  const router = useRouter()

  async function handleSaveBody() {
    setLoading(true)
    const supabase = createClient()
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const userId = profile?.id ?? session?.user?.id
      if (!userId || !session) throw new Error('Unauthorized')

      const newWeight = parseFloat(weight)
      const newBf = bodyFat.trim() ? parseFloat(bodyFat) : null
      const validation = validateBodyMetrics(
        newWeight,
        Number.isFinite(newBf as number) ? newBf : null
      )
      if (validation) {
        toast.error(validation)
        return
      }

      const { error } = await saveBodyMeasurementForUser(supabase, userId, {
        weight_kg: newWeight,
        body_fat_pct: Number.isFinite(newBf as number) ? newBf : null,
      })
      if (error) throw error

      toast.message('記下了')
      setExpanded(false)
      router.refresh()
    } catch {
      toast.error(GENTLE_ERROR_MESSAGE)
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <SettingsSection title="帳號">
      <SettingsRow label="Email" value={email} />
      <SettingsRow
        label="我的數值"
        detail={profile?.weight_kg ? `體重 ${profile.weight_kg} kg` : '偶爾更新就好'}
        onClick={() => setExpanded(!expanded)}
      />
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-b" style={{ borderColor: colors.border.subtle }}>
          <input
            type="number"
            inputMode="decimal"
            placeholder="體重 kg"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-[15px] outline-none"
            style={{ backgroundColor: colors.bg.muted, color: colors.text.primary, border: `1px solid ${colors.border.subtle}` }}
          />
          <input
            type="number"
            inputMode="decimal"
            placeholder="體脂 %（選填）"
            value={bodyFat}
            onChange={e => setBodyFat(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-[15px] outline-none"
            style={{ backgroundColor: colors.bg.muted, color: colors.text.primary, border: `1px solid ${colors.border.subtle}` }}
          />
          <button
            type="button"
            onClick={handleSaveBody}
            disabled={loading}
            className="w-full py-3 rounded-xl text-[15px] font-medium disabled:opacity-40"
            style={{ backgroundColor: colors.accent.action, color: colors.bg.elevated }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : '儲存'}
          </button>
        </div>
      )}
      <SettingsRow
        label="重排本週計畫"
        detail="生活變了？我們重新幫你排。"
        onClick={onRegenPlan}
        trailing={regenLoading ? <Loader2 className="h-4 w-4 animate-spin" style={{ color: colors.text.tertiary }} /> : undefined}
      />
      <SettingsRow
        label="登出"
        onClick={() => void handleLogout()}
        trailing={<LogOut className="h-4 w-4" style={{ color: colors.text.tertiary }} />}
        last
      />
    </SettingsSection>
  )
}
