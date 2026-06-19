'use client'

import { useState, useEffect } from 'react'
import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, LogOut, RefreshCw, AlertTriangle, CreditCard, Check } from 'lucide-react'
import type { UserProfile, Goal } from '@/types'
import { colors, cardStyle } from '@/lib/design-system'
import { pickZaiJianLine } from '@/lib/copy/zaijian'
import SubscriptionManager from './SubscriptionManager'
import { parseGeneratePlanError } from '@/lib/api-errors'
import type { WorkSchedule } from '@/lib/human-mode'
import { userMemoryFromCheckin, parseCheckinMeta, buildCheckinPayload, initDietItems, initWorkoutItems, mealModesFromCheckin } from '@/lib/checkin-utils'

export default function SettingsClient({ profile, goal }: { profile: UserProfile | null; goal: Goal | null }) {
  const [weight, setWeight] = useState(profile?.weight_kg?.toString() ?? '')
  const [bodyFat, setBodyFat] = useState(profile?.body_fat_pct?.toString() ?? '')
  const [water, setWater] = useState(profile?.water_ml_target?.toString() ?? '2000')
  const [loading, setLoading] = useState(false)
  const [regenLoading, setRegenLoading] = useState(false)
  const [workSchedule, setWorkSchedule] = useState<WorkSchedule>('standard')
  const [scheduleSaving, setScheduleSaving] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/checkin')
      .then(r => r.json())
      .then(data => {
        const mem = userMemoryFromCheckin(data.checkin ?? null)
        if (mem.work_schedule) setWorkSchedule(mem.work_schedule)
      })
      .catch(() => {})
  }, [])

  async function saveWorkSchedule(next: WorkSchedule) {
    setScheduleSaving(true)
    setWorkSchedule(next)
    try {
      const res = await fetch('/api/checkin')
      const data = await res.json()
      const checkin = data.checkin
      const meta = parseCheckinMeta(checkin ?? null)
      const mem = { ...(meta.user_memory ?? {}), work_schedule: next }
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
      toast.success(next === 'shift' ? '好，改用第一餐/第二餐/第三餐。' : '好，改回早餐/午餐/晚餐。')
      router.refresh()
    } catch {
      toast.error('存不了，稍後再試')
    } finally {
      setScheduleSaving(false)
    }
  }

  async function handleSave() {
    setLoading(true)
    const supabase = createClient()
    try {
      const newWeight = parseFloat(weight) || null
      const newBf = parseFloat(bodyFat) || null
      const waterTarget = parseInt(water) || 2000

      const bodyChanged =
        newWeight !== profile?.weight_kg ||
        newBf !== profile?.body_fat_pct

      if (bodyChanged && newWeight) {
        const res = await fetch('/api/measurements', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weight_kg: newWeight, body_fat_pct: newBf }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'measurement failed')

        if (data.planRegenerated && data.regenSummary) {
          toast.success('計畫已自動更新', { description: data.regenSummary, duration: 8000 })
        } else if (data.regenError) {
          toast.error('數值存了，但重算失敗', { description: data.regenError })
        } else {
          toast.success('記下了。')
        }
      }

      const { error } = await supabase.from('user_profiles').update({
        weight_kg: newWeight,
        body_fat_pct: newBf,
        water_ml_target: waterTarget,
      }).eq('id', profile?.id ?? '')
      if (error) throw error

      if (!bodyChanged) toast.success('記下了。')
      router.refresh()
    } catch {
      toast.error(pickZaiJianLine('error').text)
    } finally {
      setLoading(false)
    }
  }

  async function handleRegenPlan() {
    setRegenLoading(true)
    try {
      const res = await fetch('/api/generate-plan', { method: 'POST' })
      if (!res.ok) {
        toast.error(await parseGeneratePlanError(res))
        return
      }
      toast.success('好，本週重排中。')
      router.push('/dashboard')
      router.refresh()
    } catch {
      toast.error('網路連線失敗，請檢查網路後再試')
    } finally {
      setRegenLoading(false)
    }
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="px-4 pb-4 space-y-4">
      <div className="rounded-2xl p-4 space-y-3" style={cardStyle}>
        <h3 className="text-[15px] font-semibold" style={{ color: colors.text.primary }}>更新數值</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">目前體重 (kg)</Label>
            <Input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">目前體脂率 (%)</Label>
            <Input type="number" step="0.1" value={bodyFat} onChange={e => setBodyFat(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">每日喝水目標 (ml)</Label>
            <Input type="number" step="100" value={water} onChange={e => setWater(e.target.value)} className="mt-1" />
          </div>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="w-full py-3 rounded-xl text-[15px] font-semibold disabled:opacity-40"
          style={{ backgroundColor: colors.accent.action, color: '#FFFDF9' }}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : '儲存'}
        </button>
      </div>

      {goal && (
        <div className="rounded-2xl p-4" style={cardStyle}>
          <h3 className="text-[15px] font-semibold mb-2" style={{ color: colors.text.primary }}>目標</h3>
          <div className="text-[13px] space-y-1" style={{ color: colors.text.secondary }}>
            {goal.target_weight_kg && <p>目標體重 {goal.target_weight_kg} kg</p>}
            <p>到 {goal.end_date}</p>
          </div>
        </div>
      )}

      <div className="rounded-2xl p-4 space-y-3" style={cardStyle}>
        <h3 className="text-[15px] font-semibold" style={{ color: colors.text.primary }}>作息</h3>
        <p className="text-[12px]" style={{ color: colors.text.tertiary }}>
          大夜班或輪班？餐次會改成第一餐、第二餐、第三餐（睡前）。
        </p>
        <div className="flex gap-2">
          {(['standard', 'shift'] as const).map(s => (
            <button
              key={s}
              type="button"
              disabled={scheduleSaving}
              onClick={() => saveWorkSchedule(s)}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold"
              style={{
                backgroundColor: workSchedule === s ? colors.accent.action : colors.bg.muted,
                color: workSchedule === s ? '#FFFDF9' : colors.text.secondary,
              }}
            >
              {s === 'standard' ? '一般' : '輪班/夜班'}
            </button>
          ))}
        </div>
      </div>

      <Suspense fallback={<div className="px-4 h-24" />}>
        <SubscriptionManager />
      </Suspense>

      <div className="rounded-2xl p-4" style={cardStyle}>
        <h3 className="text-[15px] font-semibold mb-1" style={{ color: colors.text.primary }}>重排本週</h3>
        <p className="text-[12px] mb-3" style={{ color: colors.text.tertiary }}>體重變了就重排一下</p>
        <button
          type="button"
          onClick={handleRegenPlan}
          disabled={regenLoading}
          className="w-full py-3 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2"
          style={{ backgroundColor: colors.bg.muted, color: colors.text.primary }}
        >
          {regenLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          重排本週
        </button>
      </div>

      <div className="rounded-2xl p-4 flex gap-2" style={{ ...cardStyle, backgroundColor: colors.bg.muted }}>
        <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: colors.text.tertiary }} />
        <p className="text-[11px] leading-relaxed" style={{ color: colors.text.secondary }}>
          健康參考資訊，不構成醫療建議。不舒服先休息。
        </p>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="w-full py-3 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2"
        style={{ color: colors.text.tertiary }}
      >
        <LogOut className="h-4 w-4" /> 登出
      </button>
    </div>
  )
}
