'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient, isCapacitorNative } from '@/lib/supabase/client'
import { waitForSession } from '@/lib/supabase/wait-for-session'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, ChevronRight, ChevronLeft } from 'lucide-react'
import { addMonths, format, startOfWeek } from 'date-fns'
import { colors, cardStyle } from '@/lib/design-system'
import { BB_V2 } from '@/lib/betterbit-v2'
import { calculateGoalPlan } from '@/lib/goal-calculator'
import { formatDeficitPlain, formatProteinPlain } from '@/lib/coach-copy'
import { pickZaiJianLine, zaijian } from '@/lib/copy/zaijian'
import ZaiJian from '@/components/character/ZaiJian'
import { OnboardingCard, OnboardingChip } from '@/components/onboarding/OnboardingChip'
import type { ActivityLevel, FitnessLevel, Goal, UserProfile } from '@/types'
import { apiFetch } from '@/lib/api/client'
import AppAuthLoadingShell from '@/features/auth/AppAuthLoadingShell'
import { messageForGeneratePlanError } from '@/lib/generate-plan-errors'

const TOTAL_STEPS = 3

const buttonPrimaryStyle = {
  backgroundColor: BB_V2.accent.orange,
  color: '#FFFFFF',
  fontWeight: 600,
} as const

const buttonGhostStyle = {
  backgroundColor: BB_V2.bg.surface,
  color: BB_V2.text.secondary,
  fontWeight: 600,
} as const

interface FormData {
  gender: string
  age: string
  height_cm: string
  weight_kg: string
  body_fat_pct: string
  goal_type: string
  target_weight_kg: string
  target_body_fat_pct: string
  goal_months: string
  activity_level: ActivityLevel
  fitness_level: FitnessLevel
  equipment: string[]
  is_vegetarian: boolean
  is_vegan: boolean
  allergens: string[]
  disliked_foods: string
  food_budget: string
  injuries: string[]
}

const initialData: FormData = {
  gender: '', age: '', height_cm: '', weight_kg: '', body_fat_pct: '',
  goal_type: 'lose_fat', target_weight_kg: '', target_body_fat_pct: '', goal_months: '3',
  activity_level: 'moderate', fitness_level: 'beginner', equipment: ['none'],
  is_vegetarian: false, is_vegan: false, allergens: [], disliked_foods: '', food_budget: 'medium',
  injuries: [],
}

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<FormData>(initialData)
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false)
  const set = (key: keyof FormData, val: unknown) => setData(prev => ({ ...prev, [key]: val }))

  useEffect(() => {
    let mounted = true

    void (async () => {
      const justRegistered =
        typeof window !== 'undefined' && /[?&]login=1\b/.test(window.location.search)
      const stabilized = await waitForSession(createClient(), {
        requireAccessToken: true,
        verifyPersistedStorage: isCapacitorNative(),
        timeoutMs: justRegistered ? 5_000 : 3_000,
        intervalMs: 150,
      })
      if (!mounted) return
      if (!stabilized.ok) {
        const message =
          stabilized.reason === 'storage_not_persisted'
            ? '登入狀態無法儲存到裝置，請重新登入。'
            : stabilized.reason === 'missing_access_token'
              ? '登入憑證不完整，請重新登入。'
              : '登入連線尚未建立，請重新登入。'
        toast.error(message)
        window.location.replace('/login')
        return
      }
      setSessionReady(true)
    })()

    return () => {
      mounted = false
    }
  }, [])

  const planPreview = useMemo(() => {
    if (step < 3 || !data.weight_kg || !data.gender) return null
    const weightKg = parseFloat(data.weight_kg) || 70
    const profile = {
      gender: data.gender,
      age: parseInt(data.age) || 30,
      height_cm: parseFloat(data.height_cm) || 170,
      weight_kg: weightKg,
      body_fat_pct: parseFloat(data.body_fat_pct) || null,
      activity_level: data.activity_level,
      fitness_level: data.fitness_level,
      equipment: data.equipment.length ? data.equipment : ['none'],
    } as UserProfile
    const goal = {
      goal_type: data.goal_type,
      target_weight_kg: parseFloat(data.target_weight_kg) || null,
      target_body_fat_pct: parseFloat(data.target_body_fat_pct) || null,
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: format(addMonths(new Date(), parseInt(data.goal_months) || 3), 'yyyy-MM-dd'),
    } as Goal
    try {
      return calculateGoalPlan(profile, goal)
    } catch {
      return null
    }
  }, [step, data])

  async function handleSubmit() {
    if (!sessionReady) {
      toast.error('登入連線尚未建立，請稍後再試。')
      return
    }
    setLoading(true)
    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('未登入')

      const weightKg = parseFloat(data.weight_kg) || 70
      const gender = data.gender
      const endDate = format(addMonths(new Date(), parseInt(data.goal_months) || 3), 'yyyy-MM-dd')
      const equipment = data.equipment.length ? data.equipment : ['none']

      const profilePayload = {
        id: user.id,
        gender: data.gender || null,
        age: parseInt(data.age) || null,
        height_cm: parseFloat(data.height_cm) || null,
        weight_kg: weightKg,
        body_fat_pct: parseFloat(data.body_fat_pct) || null,
        activity_level: data.activity_level,
        fitness_level: data.fitness_level,
        is_vegetarian: data.is_vegetarian,
        is_vegan: data.is_vegan,
        allergens: data.allergens,
        disliked_foods: data.disliked_foods.split(/[,，]/).map(s => s.trim()).filter(Boolean),
        food_budget: data.food_budget,
        injuries: data.injuries,
        equipment,
        onboarding_completed: false,
        water_ml_target: Math.round(weightKg * 35),
      }
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert(profilePayload, { onConflict: 'id' })
      if (profileError) throw new Error(profileError.message)

      const goalPayload = {
        user_id: user.id,
        goal_type: data.goal_type || 'lose_fat',
        target_weight_kg: parseFloat(data.target_weight_kg) || null,
        target_body_fat_pct: parseFloat(data.target_body_fat_pct) || null,
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: endDate,
        start_weight_kg: weightKg,
        start_body_fat_pct: parseFloat(data.body_fat_pct) || null,
        is_active: true,
      }
      const { data: activeGoals, error: activeGoalError } = await supabase
        .from('goals')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      if (activeGoalError) throw new Error(activeGoalError.message)

      const primaryGoalId = activeGoals?.[0]?.id as string | undefined
      const { error: goalError } = primaryGoalId
        ? await supabase.from('goals').update(goalPayload).eq('id', primaryGoalId)
        : await supabase.from('goals').insert(goalPayload)
      if (goalError) throw new Error(goalError.message)
      const duplicateGoalIds = (activeGoals ?? [])
        .slice(1)
        .map(goal => goal.id as string)
      if (duplicateGoalIds.length) {
        const { error: duplicateGoalError } = await supabase
          .from('goals')
          .update({ is_active: false })
          .in('id', duplicateGoalIds)
        if (duplicateGoalError) throw new Error(duplicateGoalError.message)
      }

      toast.message(zaijian.generating)
      const generateRes = await apiFetch('/api/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const result = (await generateRes.json().catch(() => ({}))) as {
        error?: string
        code?: string
        data?: { days?: Array<{ daily_targets?: { calories?: number } }> }
      }
      if (!generateRes.ok) {
        throw new Error(
          messageForGeneratePlanError({ error: result.error, code: result.code })
        )
      }
      if (!result.data?.days?.length) {
        throw new Error('計畫尚未完成，請再試一次。')
      }

      const { data: completedProfile, error: completionError } = await supabase
        .from('user_profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id)
        .select('id, onboarding_completed')
        .single()
      if (completionError || !completedProfile?.onboarding_completed) {
        throw new Error(completionError?.message || '個人設定尚未完成，請再試一次。')
      }

      const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
      const [{ data: verifiedGoal }, { data: verifiedPlan }] = await Promise.all([
        supabase
          .from('goals')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)
          .maybeSingle(),
        supabase
          .from('weekly_plans')
          .select('generation_status, plan_data')
          .eq('user_id', user.id)
          .eq('week_start', weekStart)
          .maybeSingle(),
      ])
      const verifiedDays = (
        verifiedPlan?.plan_data as { days?: unknown[] } | null | undefined
      )?.days
      if (
        !verifiedGoal ||
        verifiedPlan?.generation_status !== 'completed' ||
        !verifiedDays?.length
      ) {
        throw new Error('計畫驗證尚未完成，請再試一次。')
      }

      // Hard navigation so the dashboard guard reads the freshly-written
      // onboarding_completed profile + session instead of bouncing to /login.
      toast.success('計畫已就緒，照著做就好。')
      window.location.assign('/dashboard?welcome=1&login=1')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : pickZaiJianLine('error').text)
      setLoading(false)
    }
  }

  const canNext = () => {
    if (step === 1) return data.gender && data.age && data.height_cm && data.weight_kg && data.goal_type
    if (step === 2) return !!data.activity_level
    return true
  }

  if (!sessionReady) {
    return <AppAuthLoadingShell />
  }

  return (
    <div
      className="auth-page-shell px-6 pt-7 pb-10"
      style={{ backgroundColor: BB_V2.bg.canvas, fontFamily: BB_V2.font }}
    >
      <div className="w-full mx-auto space-y-5" style={{ maxWidth: Math.min(BB_V2.maxWidth, 360) }}>
        <ZaiJian size="md" line={pickZaiJianLine(`onboarding_${Math.min(step, 4)}` as 'onboarding_1')} layout="bubble" />
        <div className="flex justify-between text-[12px] px-0.5" style={{ color: BB_V2.text.secondary }}>
          <span>認識一下</span>
          <span>{step} / {TOTAL_STEPS}</span>
        </div>
        <div
          className="h-1 rounded-full overflow-hidden"
          style={{ backgroundColor: BB_V2.bg.surface }}
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={TOTAL_STEPS}
          aria-valuenow={step}
          aria-label="註冊進度"
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%`, backgroundColor: BB_V2.accent.orange }}
          />
        </div>

        {step === 1 && <StepStart data={data} set={set} />}
        {step === 2 && <StepLifestyle data={data} set={set} />}
        {step === 3 && (
          <StepFinish
            data={data}
            set={set}
            planPreview={planPreview}
            disclaimerAccepted={disclaimerAccepted}
            onDisclaimerAccepted={setDisclaimerAccepted}
          />
        )}

        <div className="flex gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              className="flex-1 py-3 text-[15px] font-semibold flex items-center justify-center gap-1 active:opacity-90"
              style={{ ...buttonGhostStyle, borderRadius: BB_V2.radius.button }}
            >
              <ChevronLeft className="h-4 w-4" /> 上一步
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className="flex-1 py-3 text-[15px] font-semibold flex items-center justify-center gap-1 disabled:opacity-40 active:opacity-90"
              style={{ ...buttonPrimaryStyle, borderRadius: BB_V2.radius.button }}
            >
              下一步 <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !disclaimerAccepted}
              className="flex-1 py-3 text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-40 active:opacity-90"
              style={{ ...buttonPrimaryStyle, borderRadius: BB_V2.radius.button }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              開始我的計畫
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function StepStart({ data, set }: { data: FormData; set: (k: keyof FormData, v: unknown) => void }) {
  const goals = [
    { val: 'lose_fat', label: '想瘦一點（減脂）' },
    { val: 'lose_weight', label: '體重輕一點' },
    { val: 'maintain', label: '維持就好' },
  ]
  return (
    <OnboardingCard title="快速開始" desc="3 步完成。體脂、過敏之後在設定補就好。">
      <div>
        <Label className="text-[13px]" style={{ color: colors.text.secondary }}>性別</Label>
        <div className="flex gap-2 mt-2">
          {[['male', '男'], ['female', '女'], ['other', '其他']].map(([val, label]) => (
            <OnboardingChip key={val} active={data.gender === val} onClick={() => set('gender', val)} className="flex-1 py-2.5">
              {label}
            </OnboardingChip>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="age" className="text-[13px]">年齡</Label>
          <Input id="age" type="number" placeholder="30" value={data.age} onChange={e => set('age', e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="height" className="text-[13px]">身高 cm</Label>
          <Input id="height" type="number" placeholder="170" value={data.height_cm} onChange={e => set('height_cm', e.target.value)} className="mt-1" />
        </div>
        <div className="col-span-2">
          <Label htmlFor="weight" className="text-[13px]">體重 kg</Label>
          <Input id="weight" type="number" placeholder="70" value={data.weight_kg} onChange={e => set('weight_kg', e.target.value)} step="0.1" className="mt-1" />
        </div>
      </div>
      <div>
        <Label className="text-[13px]">目標</Label>
        <div className="grid grid-cols-1 gap-2 mt-2">
          {goals.map(g => (
            <OnboardingChip key={g.val} active={data.goal_type === g.val} onClick={() => set('goal_type', g.val)} className="w-full py-2.5 px-4 text-left">
              {g.label}
            </OnboardingChip>
          ))}
        </div>
      </div>
      <div>
        <Label className="text-[13px]">大概多久</Label>
        <div className="flex gap-2 mt-2">
          {[['1', '1 個月'], ['3', '3 個月'], ['6', '6 個月']].map(([val, label]) => (
            <OnboardingChip key={val} active={data.goal_months === val} onClick={() => set('goal_months', val)} className="flex-1 py-2">
              {label}
            </OnboardingChip>
          ))}
        </div>
      </div>
    </OnboardingCard>
  )
}

function StepLifestyle({ data, set }: { data: FormData; set: (k: keyof FormData, v: unknown) => void }) {
  const activities: { val: ActivityLevel; label: string; desc: string }[] = [
    { val: 'sedentary', label: '久坐', desc: '辦公室、很少動' },
    { val: 'light', label: '輕度', desc: '偶爾走路、家事' },
    { val: 'moderate', label: '中度', desc: '每週運動 2–3 次' },
    { val: 'active', label: '活躍', desc: '每週運動 4–5 次' },
    { val: 'very_active', label: '高強度', desc: '體力工作或每天動' },
  ]
  return (
    <OnboardingCard title="生活型態" desc="活動量與飲食習慣，大概選就好。過敏可在設定補。">
      <div>
        <Label className="text-[13px]">平常活動量</Label>
        <div className="grid grid-cols-1 gap-2 mt-2">
          {activities.map(a => (
            <OnboardingChip key={a.val} active={data.activity_level === a.val} onClick={() => set('activity_level', a.val)} className="w-full py-2.5 px-3 text-left">
              <span className="font-semibold">{a.label}</span>
              <span className="block text-[11px] opacity-80">{a.desc}</span>
            </OnboardingChip>
          ))}
        </div>
      </div>
      <div>
        <Label className="text-[13px]">外食預算</Label>
        <div className="flex gap-2 mt-2">
          {[['low', '省'], ['medium', '中'], ['high', '高']].map(([val, label]) => (
            <OnboardingChip key={val} active={data.food_budget === val} onClick={() => set('food_budget', val)} className="flex-1 py-2">
              {label}
            </OnboardingChip>
          ))}
        </div>
      </div>
      <p className="text-[12px] leading-relaxed" style={{ color: colors.text.tertiary }}>
        外食、自己煮、家庭共餐都可以。完成後首頁會直接給你一餐建議，不用先記帳。
      </p>
    </OnboardingCard>
  )
}

function StepFinish({
  data,
  set,
  planPreview,
  disclaimerAccepted,
  onDisclaimerAccepted,
}: {
  data: FormData
  set: (k: keyof FormData, v: unknown) => void
  planPreview: ReturnType<typeof calculateGoalPlan> | null
  disclaimerAccepted: boolean
  onDisclaimerAccepted: (accepted: boolean) => void
}) {
  const [showEquipment, setShowEquipment] = useState(true)
  const [showInjuries, setShowInjuries] = useState(false)
  const [showPlanPreview, setShowPlanPreview] = useState(true)

  const injuries = [
    { val: 'knee', label: '膝蓋' }, { val: 'back', label: '腰' },
    { val: 'shoulder', label: '肩' }, { val: 'wrist', label: '手腕' },
  ]
  const equipmentOptions = [
    { val: 'none', label: '無器材（在家徒手）' },
    { val: 'jump_rope', label: '跳繩' },
    { val: 'dumbbells', label: '啞鈴' },
    { val: 'resistance_bands', label: '彈力帶' },
    { val: 'pull_up_bar', label: '引體向上架' },
    { val: 'gym', label: '健身房' },
  ]

  const toggleEquipment = (val: string) => {
    if (val === 'none') {
      set('equipment', ['none'])
      return
    }
    const next = toggle(
      data.equipment.filter(e => e !== 'none'),
      val
    )
    set('equipment', next.length ? next : ['none'])
  }

  return (
    <div className="space-y-4">
      <OnboardingCard title="最後確認" desc="設定減脂助手，不是填醫療問卷。選填項目可以略過。">
        <CollapsibleSection
          title="你手邊有哪些器材？"
          open={showEquipment}
          onToggle={() => setShowEquipment(v => !v)}
        >
          <div className="flex flex-wrap gap-2 mt-2">
            {equipmentOptions.map(({ val, label }) => (
              <OnboardingChip
                key={val}
                active={data.equipment.includes(val)}
                onClick={() => toggleEquipment(val)}
                className="px-3 py-2"
              >
                {label}
              </OnboardingChip>
            ))}
          </div>
          <p className="text-[11px] mt-2 leading-relaxed" style={{ color: BB_V2.text.secondary }}>
            沒有器材也沒問題，會優先安排慢跑、快走、徒手訓練。
          </p>
        </CollapsibleSection>

        <CollapsibleSection
          title="哪裡不舒服（選填）"
          open={showInjuries}
          onToggle={() => setShowInjuries(v => !v)}
        >
          <div className="flex flex-wrap gap-2 mt-2">
            {injuries.map(({ val, label }) => (
              <OnboardingChip key={val} active={data.injuries.includes(val)} onClick={() => set('injuries', toggle(data.injuries, val))} className="px-3 py-2">
                {label}
              </OnboardingChip>
            ))}
          </div>
        </CollapsibleSection>
      </OnboardingCard>

      {planPreview && (
        <CollapsibleSection
          title="你的個人化計畫預覽"
          open={showPlanPreview}
          onToggle={() => setShowPlanPreview(v => !v)}
          card
        >
          <div className="grid grid-cols-2 gap-2 text-[13px] mt-2">
            <PreviewMetric label="每日熱量" value={`${planPreview.dailyCalories} kcal`} />
            <PreviewMetric label="蛋白質" value={`${planPreview.proteinGrams} g`} />
            {planPreview.dailyDeficit > 0 && (
              <PreviewMetric label="熱量缺口" value={`-${planPreview.dailyDeficit} kcal`} span={2} />
            )}
          </div>
          <p className="text-[12px] mt-3 leading-relaxed" style={{ color: BB_V2.text.secondary }}>
            {planPreview.dailyDeficit > 0 && formatDeficitPlain(planPreview.dailyDeficit) + '。'}
            {formatProteinPlain(planPreview.proteinGrams, planPreview.leanMassKg)}。
          </p>
        </CollapsibleSection>
      )}

      <ul className="text-[13px] space-y-1.5 px-1" style={{ color: BB_V2.text.secondary }}>
        <li>· 完成後直接進 Today，從第一餐開始</li>
        <li>· 不用補過去，記錄下一餐就好</li>
        <li>· 不知道吃什麼，可以讓 Betterbit 幫你算</li>
      </ul>

      <label
        className="flex items-start gap-3 p-4 cursor-pointer"
        style={{ backgroundColor: BB_V2.bg.surface, borderRadius: BB_V2.radius.input }}
      >
        <input
          type="checkbox"
          checked={disclaimerAccepted}
          onChange={e => onDisclaimerAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0"
          style={{ accentColor: BB_V2.accent.orange }}
        />
        <span className="text-[12px] leading-relaxed" style={{ color: BB_V2.text.secondary }}>
          Betterbit 提供健康與飲食輔助建議，不能取代醫師、營養師或其他專業醫療建議。食物辨識與熱量估算僅供參考。
          <span className="block mt-2 font-medium" style={{ color: BB_V2.text.primary }}>
            我了解
          </span>
        </span>
      </label>
    </div>
  )
}

function CollapsibleSection({
  title,
  open,
  onToggle,
  children,
  card,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
  card?: boolean
}) {
  const Wrapper = card ? 'div' : 'div'
  return (
    <Wrapper
      className={card ? 'p-4' : ''}
      style={card ? { ...cardStyle, borderRadius: BB_V2.radius.card } : undefined}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-2 text-left"
      >
        <span className="text-[14px] font-semibold" style={{ color: BB_V2.text.primary }}>{title}</span>
        <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} style={{ color: BB_V2.text.secondary }} />
      </button>
      {open ? <div className="mt-2">{children}</div> : null}
    </Wrapper>
  )
}

function PreviewMetric({ label, value, span = 1 }: { label: string; value: string; span?: number }) {
  return (
    <div
      className="px-3 py-2"
      style={{ backgroundColor: BB_V2.bg.surface, borderRadius: BB_V2.radius.input, gridColumn: span === 2 ? 'span 2 / span 2' : undefined }}
    >
      <p className="text-[10px]" style={{ color: BB_V2.text.secondary }}>{label}</p>
      <p className="font-semibold" style={{ color: BB_V2.text.primary }}>{value}</p>
    </div>
  )
}
