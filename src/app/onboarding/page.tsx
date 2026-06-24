'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, ChevronRight, ChevronLeft } from 'lucide-react'
import { addMonths, format } from 'date-fns'
import { colors, cardStyle } from '@/lib/design-system'
import { calculateGoalPlan } from '@/lib/goal-calculator'
import { formatDeficitPlain, formatProteinPlain, formatWeeklyFatLoss } from '@/lib/coach-copy'
import { pickZaiJianLine, zaijian } from '@/lib/copy/zaijian'
import ZaiJian from '@/components/character/ZaiJian'
import { OnboardingCard, OnboardingChip } from '@/components/onboarding/OnboardingChip'
import type { ActivityLevel, FitnessLevel, Goal, UserProfile } from '@/types'

const TOTAL_STEPS = 3

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
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false)
  const router = useRouter()
  const set = (key: keyof FormData, val: unknown) => setData(prev => ({ ...prev, [key]: val }))

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
    setLoading(true)
    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('未登入')

      const weightKg = parseFloat(data.weight_kg) || 70
      const gender = data.gender
      const endDate = format(addMonths(new Date(), parseInt(data.goal_months) || 3), 'yyyy-MM-dd')
      const equipment = data.equipment.length ? data.equipment : ['none']

      const { error: profileError } = await supabase.from('user_profiles').upsert({
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
        onboarding_completed: true,
        water_ml_target: Math.round(weightKg * 35),
      })
      if (profileError) throw new Error(profileError.message)

      const { error: goalError } = await supabase.from('goals').insert({
        user_id: user.id,
        goal_type: data.goal_type || 'lose_fat',
        target_weight_kg: parseFloat(data.target_weight_kg) || null,
        target_body_fat_pct: parseFloat(data.target_body_fat_pct) || null,
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: endDate,
        start_weight_kg: weightKg,
        start_body_fat_pct: parseFloat(data.body_fat_pct) || null,
        is_active: true,
      })
      if (goalError) throw new Error(goalError.message)

      toast.message(zaijian.generating)
      try {
        const generateRes = await fetch('/api/generate-plan', { method: 'POST' })
        const result = await generateRes.json()
        if (!generateRes.ok) throw new Error(result.error || 'plan failed')
        toast.success('計畫已就緒，照著做就好。')
      } catch {
        toast.error(pickZaiJianLine('error').text)
      }

      router.push('/dashboard?welcome=1')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : pickZaiJianLine('error').text)
    } finally {
      setLoading(false)
    }
  }

  const canNext = () => {
    if (step === 1) return data.gender && data.age && data.height_cm && data.weight_kg && data.goal_type
    if (step === 2) return !!data.activity_level
    return true
  }

  return (
    <div className="auth-page-shell p-4 pt-8 pb-12" style={{ backgroundColor: colors.bg.canvas }}>
      <div className="w-full max-w-xl mx-auto space-y-6">
        <ZaiJian size="lg" line={pickZaiJianLine(`onboarding_${Math.min(step, 4)}` as 'onboarding_1')} layout="bubble" />
        <div className="flex justify-between text-[13px]" style={{ color: colors.text.tertiary }}>
          <span>認識一下</span>
          <span>{step} / {TOTAL_STEPS}</span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: colors.bg.muted }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%`, backgroundColor: colors.accent.action }}
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
              className="flex-1 py-3 rounded-xl text-[15px] font-semibold flex items-center justify-center gap-1"
              style={{ backgroundColor: colors.bg.muted, color: colors.text.secondary }}
            >
              <ChevronLeft className="h-4 w-4" /> 上一步
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className="flex-1 py-3 rounded-xl text-[15px] font-semibold flex items-center justify-center gap-1 disabled:opacity-40"
              style={{ backgroundColor: colors.accent.action, color: '#FFFDF9' }}
            >
              下一步 <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !disclaimerAccepted}
              className="flex-1 py-3 rounded-xl text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ backgroundColor: colors.accent.action, color: '#FFFDF9' }}
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
      <OnboardingCard title="最後確認" desc="有傷的話跟我說，動作會避開。">
        <div>
          <Label className="text-[13px]">你手邊有哪些器材？</Label>
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
          <p className="text-[11px] mt-2 leading-relaxed" style={{ color: colors.text.tertiary }}>
            沒有器材也沒問題，會優先安排慢跑、快走、徒手訓練。
          </p>
        </div>
        <div>
          <Label className="text-[13px]">哪裡不舒服（選填）</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {injuries.map(({ val, label }) => (
              <OnboardingChip key={val} active={data.injuries.includes(val)} onClick={() => set('injuries', toggle(data.injuries, val))} className="px-3 py-2">
                {label}
              </OnboardingChip>
            ))}
          </div>
        </div>
      </OnboardingCard>

      {planPreview && (
        <div className="rounded-2xl p-5 space-y-3" style={cardStyle}>
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: colors.accent.action }}>
            你的個人化計畫預覽
          </p>
          <div className="grid grid-cols-2 gap-2 text-[13px]">
            <PreviewMetric label="每日熱量" value={`${planPreview.dailyCalories} kcal`} />
            <PreviewMetric label="蛋白質" value={`${planPreview.proteinGrams} g`} />
            {planPreview.dailyDeficit > 0 && (
              <PreviewMetric label="熱量缺口" value={`-${planPreview.dailyDeficit} kcal`} span={2} />
            )}
            <PreviewMetric label="每週運動" value="重訓 3 次 + 有氧 3 次" span={2} />
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: colors.text.secondary }}>
            {planPreview.dailyDeficit > 0 && formatDeficitPlain(planPreview.dailyDeficit) + '。'}
            {formatProteinPlain(planPreview.proteinGrams, planPreview.leanMassKg)}。
            {formatWeeklyFatLoss(Math.round(planPreview.weeklyChangeKg * 1000))}。
          </p>
          <p className="text-[11px]" style={{ color: colors.text.tertiary }}>
            系統會依這些數字，自動設計每日三餐與課表。你不用自己算。
          </p>
        </div>
      )}

      <ul className="text-[13px] space-y-1.5 px-1" style={{ color: colors.text.secondary }}>
        <li>· 14 天免費試用，完整計畫</li>
        <li>· 進首頁就有第一餐建議（mini-win）</li>
        <li>· 不喜歡可換同熱量組合</li>
      </ul>

      <label
        className="flex items-start gap-3 rounded-2xl p-4 cursor-pointer"
        style={{ backgroundColor: colors.bg.muted }}
      >
        <input
          type="checkbox"
          checked={disclaimerAccepted}
          onChange={e => onDisclaimerAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
          style={{ accentColor: colors.accent.action }}
        />
        <span className="text-[13px] leading-relaxed" style={{ color: colors.text.secondary }}>
          BetterBit 提供健康與飲食輔助建議，不能取代醫師、營養師或其他專業醫療建議。食物辨識與熱量估算僅供參考。
          <span className="block mt-2 font-medium" style={{ color: colors.text.primary }}>
            我了解
          </span>
        </span>
      </label>
    </div>
  )
}

function PreviewMetric({ label, value, span = 1 }: { label: string; value: string; span?: number }) {
  return (
    <div
      className="rounded-xl px-3 py-2"
      style={{ backgroundColor: colors.bg.muted, gridColumn: span === 2 ? 'span 2 / span 2' : undefined }}
    >
      <p className="text-[10px]" style={{ color: colors.text.tertiary }}>{label}</p>
      <p className="font-semibold" style={{ color: colors.text.primary }}>{value}</p>
    </div>
  )
}
