'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { UserProfile } from '@/types'
import type { AccessStatus } from '@/lib/subscription-access'
import type { WorkSchedule } from '@/lib/human-mode'
import { parseGeneratePlanError } from '@/lib/api-errors'
import {
  userMemoryFromCheckin,
  parseCheckinMeta,
  buildCheckinPayload,
  initDietItems,
  initWorkoutItems,
  mealModesFromCheckin,
} from '@/lib/checkin-utils'
import SettingsHeader from './SettingsHeader'
import SettingsAccountSection from './SettingsAccountSection'
import SettingsPremiumTeaser from './SettingsPremiumTeaser'
import SettingsHealthSection from './SettingsHealthSection'
import SettingsNotificationsSection from './SettingsNotificationsSection'
import SettingsPrivacySection from './SettingsPrivacySection'
import SettingsSupportSection from './SettingsSupportSection'
import SettingsAboutSection from './SettingsAboutSection'

interface Props {
  profile: UserProfile | null
  email: string
  access: AccessStatus
}

export default function SettingsScreen({ profile, email, access }: Props) {
  const [workSchedule, setWorkSchedule] = useState<WorkSchedule>('standard')
  const [eatingContext, setEatingContext] = useState<'solo' | 'family'>('solo')
  const [scheduleSaving, setScheduleSaving] = useState(false)
  const [regenLoading, setRegenLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/checkin')
      .then(r => r.json())
      .then(data => {
        const mem = userMemoryFromCheckin(data.checkin ?? null)
        if (mem.work_schedule) setWorkSchedule(mem.work_schedule)
        if (mem.eating_context) setEatingContext(mem.eating_context)
      })
      .catch(() => {})
  }, [])

  const patchMemory = useCallback(
    async (patch: { work_schedule?: WorkSchedule; eating_context?: 'solo' | 'family' }) => {
      setScheduleSaving(true)
      try {
        const res = await fetch('/api/checkin')
        const data = await res.json()
        const checkin = data.checkin
        const meta = parseCheckinMeta(checkin ?? null)
        const mem = { ...(meta.user_memory ?? {}), ...patch }
        const payload = buildCheckinPayload(
          {
            dietItems: checkin?.diet_items ?? initDietItems(checkin),
            workoutItems: checkin?.workout_items ?? initWorkoutItems(checkin, []),
            waterMl: checkin?.water_ml ?? 0,
            mealModes: mealModesFromCheckin(checkin),
            customEatOut: meta.custom_eat_out,
            dailyRolls: meta.daily_rolls,
            mealSuggest: meta.meal_suggest,
            userMemory: mem,
          },
          checkin?.weekly_plan_id ?? null
        )
        const saveRes = await fetch('/api/checkin', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!saveRes.ok) throw new Error()
        if (patch.work_schedule) setWorkSchedule(patch.work_schedule)
        if (patch.eating_context) setEatingContext(patch.eating_context)
        toast.message('好')
        router.refresh()
      } catch {
        toast.error('存不了，稍後再試')
      } finally {
        setScheduleSaving(false)
      }
    },
    [router]
  )

  async function handleRegenPlan() {
    setRegenLoading(true)
    try {
      const res = await fetch('/api/generate-plan', { method: 'POST' })
      if (!res.ok) {
        toast.error(await parseGeneratePlanError(res))
        return
      }
      toast.message('好，本週重排中')
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast.error('網路連線失敗')
    } finally {
      setRegenLoading(false)
    }
  }

  return (
    <div className="pb-12">
      <SettingsHeader />
      <SettingsAccountSection
        profile={profile}
        email={email}
        workSchedule={workSchedule}
        eatingContext={eatingContext}
        scheduleSaving={scheduleSaving}
        onWorkSchedule={s => void patchMemory({ work_schedule: s })}
        onEatingContext={c => void patchMemory({ eating_context: c })}
        onRegenPlan={() => void handleRegenPlan()}
        regenLoading={regenLoading}
      />
      <SettingsPremiumTeaser access={access} />
      <SettingsHealthSection />
      <SettingsNotificationsSection />
      <SettingsPrivacySection />
      <SettingsSupportSection />
      <SettingsAboutSection />
    </div>
  )
}
