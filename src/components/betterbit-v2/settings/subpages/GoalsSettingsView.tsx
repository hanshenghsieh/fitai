'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { addDays, differenceInDays, format, parseISO } from 'date-fns'
import {
  Flag,
  Scale,
  Percent,
  Calendar,
  Calculator,
  Flame,
  Beef,
  Wheat,
  Circle,
  Database,
  Gauge,
  RefreshCw,
  Snail,
  Rocket,
} from 'lucide-react'
import { calculateGoalPlan, calculateBMR } from '@/lib/goal-calculator'
import { calorieFloorFromGender } from '@/lib/engines/calorie-bank-engine'
import {
  parseOptionalNumber,
  validateBodyFatPct,
  validateDailyCalories,
  validateMacroGrams,
  validateWeightKg,
} from '@/lib/settings/settings-validation'
import { useSettingsDirtyTracker, useSettingsSave } from '@/hooks/useSettingsForm'
import {
  buildPacePreviews,
  manualPaceDescription,
  paceToCalorieBankIntensity,
  resolveFatLossPace,
  type FatLossPace,
} from '@/lib/fat-loss-pace'
import type { SettingsBundle } from '@/lib/app/settings-data'
import type { Goal, UserProfile } from '@/types'
import V2SettingsVisualShell from '@/components/betterbit-v2/settings/visual-v2/V2SettingsVisualShell'
import V2SettingsVisualCard from '@/components/betterbit-v2/settings/visual-v2/V2SettingsVisualCard'
import {
  V2VisualGoalRow,
  V2VisualChevronRow,
  V2VisualPaceCard,
  V2VisualNutrientTile,
  V2VisualPickerSheet,
  useVisualPicker,
} from '@/components/betterbit-v2/settings/visual-v2/V2SettingsVisualPrimitives'
import V2SettingsSwitch from '@/components/betterbit-v2/settings/V2SettingsSwitch'

const GOAL_TYPES = [
  { value: 'lose_fat', label: '減脂' },
  { value: 'maintain', label: '維持' },
  { value: 'gain_muscle', label: '增肌' },
  { value: 'body_recomp', label: '改善飲食習慣' },
]

const TARGET_DAYS = [
  { value: 'auto', label: '依減脂節奏自動估算' },
  { value: '30', label: '30 天' },
  { value: '60', label: '60 天' },
  { value: '90', label: '90 天' },
  { value: '120', label: '120 天' },
]

const CALORIE_MODES = [
  { value: 'auto', label: '系統自動' },
  { value: 'manual', label: '手動設定' },
]

const BANK_DAYS = [
  { value: '3', label: '3 天' },
  { value: '5', label: '5 天' },
  { value: '10', label: '10 天' },
]

const BANK_INTENSITY = [
  { value: 'gentle', label: '溫和' },
  { value: 'standard', label: '標準' },
  { value: 'aggressive', label: '積極' },
]

const PACE_ICONS: Record<FatLossPace, ReactNode> = {
  conservative: <Snail className="h-4 w-4" />,
  standard: <Scale className="h-4 w-4" />,
  aggressive: <Rocket className="h-4 w-4" />,
}

function inferInitialTargetDays(goal: Goal | null): string {
  if (!goal?.start_date || !goal?.end_date) return '90'
  const days = differenceInDays(parseISO(goal.end_date), parseISO(goal.start_date))
  if (days <= 35) return '30'
  if (days <= 65) return '60'
  if (days <= 95) return '90'
  if (days <= 125) return '120'
  return 'auto'
}

function fmtKg(n: number) {
  return n.toFixed(2)
}

function fmtKcal(n: number) {
  return Math.round(n).toLocaleString()
}

function labelOf(options: { value: string; label: string }[], value: string) {
  return options.find(o => o.value === value)?.label ?? value
}

export default function GoalsSettingsView({ initial }: { initial: SettingsBundle }) {
  const { picker, openPicker, closePicker } = useVisualPicker()
  const goal = initial.goal
  const profile = initial.profile as UserProfile

  const [goalType, setGoalType] = useState(goal?.goal_type ?? 'lose_fat')
  const [targetWeight, setTargetWeight] = useState(String(goal?.target_weight_kg ?? ''))
  const [targetBf, setTargetBf] = useState(String(goal?.target_body_fat_pct ?? ''))
  const [targetDays, setTargetDays] = useState(inferInitialTargetDays(goal))
  const [pace, setPace] = useState<FatLossPace>(
    resolveFatLossPace(initial.preferences.fat_loss_pace ?? initial.preferences.goal_pace)
  )
  const [calorieMode, setCalorieMode] = useState<'auto' | 'manual'>(
    initial.preferences.calorie_mode ?? 'auto'
  )
  const [manualKcal, setManualKcal] = useState(String(initial.preferences.manual_calorie_target ?? ''))
  const [manualProtein, setManualProtein] = useState(String(initial.preferences.manual_protein_g ?? ''))
  const [manualCarbs, setManualCarbs] = useState(String(initial.preferences.manual_carbs_g ?? ''))
  const [manualFat, setManualFat] = useState(String(initial.preferences.manual_fat_g ?? ''))
  const [bankEnabled, setBankEnabled] = useState(initial.preferences.calorie_bank_enabled ?? true)
  const [bankDays, setBankDays] = useState(String(initial.preferences.calorie_bank_days ?? 5))
  const [bankIntensity, setBankIntensity] = useState(
    initial.preferences.calorie_bank_intensity ?? paceToCalorieBankIntensity(pace)
  )

  const goalDraft = useMemo(() => {
    const start = goal?.start_date ?? format(new Date(), 'yyyy-MM-dd')
    const daysNum = targetDays === 'auto' ? null : Number(targetDays)
    const end =
      daysNum != null
        ? format(addDays(new Date(), daysNum), 'yyyy-MM-dd')
        : goal?.end_date ?? format(addDays(new Date(), 90), 'yyyy-MM-dd')
    return {
      goal_type: goalType,
      target_weight_kg: targetWeight ? Number(targetWeight) : null,
      target_body_fat_pct: targetBf ? Number(targetBf) : null,
      start_date: start,
      end_date: end,
    } as Goal
  }, [goal, goalType, targetWeight, targetBf, targetDays])

  const planOptions = useMemo(
    () => ({
      fat_loss_pace: pace,
      calorie_mode: calorieMode,
      manual_calorie_target: manualKcal ? Number(manualKcal) : null,
      target_days: targetDays === 'auto' ? null : Number(targetDays),
    }),
    [pace, calorieMode, manualKcal, targetDays]
  )

  const autoPlan = useMemo(() => {
    try {
      return calculateGoalPlan(profile, goalDraft, planOptions)
    } catch {
      return null
    }
  }, [profile, goalDraft, planOptions])

  const pacePreviews = useMemo(() => buildPacePreviews(profile, pace), [profile, pace])
  const manualPaceHint = useMemo(() => {
    if (calorieMode !== 'manual' || !manualKcal) return null
    return manualPaceDescription(profile, Number(manualKcal))
  }, [calorieMode, manualKcal, profile])

  function selectPace(next: FatLossPace) {
    setPace(next)
    setBankIntensity(paceToCalorieBankIntensity(next))
  }

  const formSnapshot = {
    goalType,
    targetWeight,
    targetBf,
    targetDays,
    pace,
    calorieMode,
    manualKcal,
    manualProtein,
    manualCarbs,
    manualFat,
    bankEnabled,
    bankDays,
    bankIntensity,
  }

  const { isDirty, markSaved } = useSettingsDirtyTracker(formSnapshot)

  const { saving, save: handleSave } = useSettingsSave({
    validate: () => {
      const weightErr = targetWeight ? validateWeightKg(Number(targetWeight)) : null
      if (weightErr) return weightErr
      const bfErr = targetBf ? validateBodyFatPct(Number(targetBf)) : null
      if (bfErr) return bfErr
      if (calorieMode === 'manual') {
        const kcalErr = validateDailyCalories(parseOptionalNumber(manualKcal), profile)
        if (kcalErr) return kcalErr
        const proteinErr = validateMacroGrams(parseOptionalNumber(manualProtein), '蛋白質')
        if (proteinErr) return proteinErr
        const carbsErr = validateMacroGrams(parseOptionalNumber(manualCarbs), '碳水')
        if (carbsErr) return carbsErr
        const fatErr = validateMacroGrams(parseOptionalNumber(manualFat), '脂肪')
        if (fatErr) return fatErr
      }
      return null
    },
    onSave: async () => {
      const daysNum = targetDays === 'auto' ? null : Number(targetDays)
      const res = await fetch('/api/settings/goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal_type: goalType,
          target_weight_kg: targetWeight ? Number(targetWeight) : null,
          target_body_fat_pct: targetBf ? Number(targetBf) : null,
          target_days: daysNum,
          end_date: autoPlan?.projectedEndDate,
          preferences: {
            fat_loss_pace: pace,
            goal_pace: pace,
            calorie_mode: calorieMode,
            manual_calorie_target: manualKcal ? Number(manualKcal) : null,
            manual_protein_g: manualProtein ? Number(manualProtein) : null,
            manual_carbs_g: manualCarbs ? Number(manualCarbs) : null,
            manual_fat_g: manualFat ? Number(manualFat) : null,
            calorie_bank_enabled: bankEnabled,
            calorie_bank_days: Number(bankDays) as 3 | 5 | 10,
            calorie_bank_intensity: bankIntensity,
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '儲存失敗')
    },
    onSuccess: markSaved,
    successMessage: '目標設定已更新，今天的計畫會重新計算',
  })

  const displayKcal = calorieMode === 'auto' ? autoPlan?.dailyCalories : manualKcal
  const displayProtein = calorieMode === 'auto' ? autoPlan?.proteinGrams : manualProtein
  const displayCarbs = calorieMode === 'auto' ? autoPlan?.carbsGrams : manualCarbs
  const displayFat = calorieMode === 'auto' ? autoPlan?.fatGrams : manualFat
  const bmr = calculateBMR(profile)
  const isFatLossGoal =
    goalType === 'lose_fat' || goalType === 'lose_weight' || goalType === 'body_recomp'
  const manualBelowFloor =
    calorieMode === 'manual' &&
    manualKcal &&
    Number(manualKcal) < calorieFloorFromGender(profile.gender)
  const isAuto = calorieMode === 'auto'

  return (
    <>
      <V2SettingsVisualShell
        title="目標設定"
        subtitle="BetterBit 會依照你的目標，自動調整每日熱量、蛋白質與減脂節奏。"
        saveLabel="儲存目標設定"
        onSave={handleSave}
        saving={saving}
        saveDisabled={!isDirty || Boolean(manualBelowFloor)}
        isDirty={isDirty}
      >
        <V2SettingsVisualCard icon={<Flag className="h-4 w-4" />} title="主要目標" staggerIndex={0}>
          <V2VisualChevronRow
            icon={<Flag className="h-4 w-4" />}
            label="目前目標"
            value={labelOf(GOAL_TYPES, goalType)}
            onClick={() =>
              openPicker({
                key: 'goal',
                title: '目前目標',
                options: GOAL_TYPES,
                value: goalType,
                onSelect: setGoalType,
              })
            }
          />
          <V2VisualGoalRow
            icon={<Scale className="h-4 w-4" />}
            label="目標體重 (kg)"
            value={targetWeight}
            onChange={setTargetWeight}
            type="number"
          />
          <V2VisualGoalRow
            icon={<Percent className="h-4 w-4" />}
            label="目標體脂 (%)"
            value={targetBf}
            onChange={setTargetBf}
            type="number"
          />
          <V2VisualChevronRow
            icon={<Calendar className="h-4 w-4" />}
            label="希望達成時間"
            value={labelOf(TARGET_DAYS, targetDays)}
            onClick={() =>
              openPicker({
                key: 'days',
                title: '希望達成時間',
                options: TARGET_DAYS,
                value: targetDays,
                onSelect: setTargetDays,
              })
            }
          />
        </V2SettingsVisualCard>

        {isFatLossGoal && (
          <V2SettingsVisualCard icon={<Gauge className="h-4 w-4" />} title="減脂節奏" staggerIndex={1}>
            {pacePreviews.map(card => (
              <V2VisualPaceCard
                key={card.pace}
                icon={PACE_ICONS[card.pace]}
                title={card.title}
                subtitle={card.subtitle}
                description={card.description}
                weeklyLoss={`${fmtKg(card.weeklyLossMinKg)}–${fmtKg(card.weeklyLossMaxKg)} kg`}
                dailyKcal={`${fmtKcal(card.dailyCalorieMin)}–${fmtKcal(card.dailyCalorieMax)} kcal`}
                selected={pace === card.pace}
                onSelect={() => selectPace(card.pace)}
              />
            ))}
            {autoPlan?.warnings?.tooAggressive && (
              <p className="text-[12px] mt-3 p-3 rounded-xl" style={{ backgroundColor: '#fff5f5', color: '#c0392b' }}>
                {autoPlan.warnings.tooAggressiveMessage}
              </p>
            )}
          </V2SettingsVisualCard>
        )}

        <V2SettingsVisualCard icon={<Flame className="h-4 w-4" />} title="每日熱量策略" staggerIndex={2}>
          <V2VisualChevronRow
            icon={<Calculator className="h-4 w-4" />}
            label="每日熱量模式"
            value={labelOf(CALORIE_MODES, calorieMode)}
            subtitle={`由系統根據你的身體數據、減脂節奏與目標自動計算（BMR 約 ${bmr} kcal）`}
            onClick={() =>
              openPicker({
                key: 'calmode',
                title: '每日熱量模式',
                options: CALORIE_MODES,
                value: calorieMode,
                onSelect: v => setCalorieMode(v as 'auto' | 'manual'),
              })
            }
          />
          {manualPaceHint && (
            <p className="text-[12px] p-3 rounded-xl mb-2" style={{ backgroundColor: '#eef8e9', color: '#123d24' }}>
              {manualPaceHint}
            </p>
          )}
          {manualBelowFloor && (
            <p className="text-[12px] p-3 rounded-xl mb-2" style={{ backgroundColor: '#fff5f5', color: '#c0392b' }}>
              每日熱量低於安全下限（{calorieFloorFromGender(profile.gender)} kcal），請調高熱量或改選系統自動模式。
            </p>
          )}
          <div className="v2-sv2-kcal-row">
            <div className="flex items-center gap-2">
              <div className="v2-sv2-row-icon">
                <Flame className="h-4 w-4" />
              </div>
              <span className="v2-sv2-row-label">每日熱量目標 (kcal)</span>
            </div>
            {isAuto ? (
              <span className="v2-sv2-kcal-value">{displayKcal ? fmtKcal(Number(displayKcal)) : '—'}</span>
            ) : (
              <input
                type="number"
                value={manualKcal}
                onChange={e => setManualKcal(e.target.value)}
                className="v2-sv2-goal-input"
                style={{ maxWidth: 100, fontSize: 22, color: '#2f8f35' }}
              />
            )}
          </div>
          <div className="v2-sv2-nutrient-grid">
            <V2VisualNutrientTile
              icon={<Beef className="h-3.5 w-3.5" />}
              label="蛋白質 (g)"
              value={String(displayProtein ?? '')}
              onChange={setManualProtein}
              readOnly={isAuto}
            />
            <V2VisualNutrientTile
              icon={<Wheat className="h-3.5 w-3.5" />}
              label="碳水 (g)"
              value={String(displayCarbs ?? '')}
              onChange={setManualCarbs}
              readOnly={isAuto}
            />
            <V2VisualNutrientTile
              icon={<Circle className="h-3.5 w-3.5" />}
              label="脂肪 (g)"
              value={String(displayFat ?? '')}
              onChange={setManualFat}
              readOnly={isAuto}
            />
          </div>
        </V2SettingsVisualCard>

        <V2SettingsVisualCard icon={<RefreshCw className="h-4 w-4" />} title="回補策略" staggerIndex={3}>
          <div className="v2-sv2-toggle-row">
            <div className="v2-sv2-row-icon">
              <Database className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="v2-sv2-row-label">Calorie Bank</p>
              <p className="text-[12px] mt-0.5" style={{ color: '#7a807a' }}>
                把短期超標分攤到未來幾天，避免一次吃多就放棄。
              </p>
            </div>
            <V2SettingsSwitch checked={bankEnabled} onChange={setBankEnabled} />
          </div>
          {!bankEnabled && (
            <p className="text-[12px] mb-2 p-3 rounded-xl" style={{ backgroundColor: '#eef8e9', color: '#7a807a' }}>
              Calorie Bank 目前已關閉。Today 不會套用回補調整。
            </p>
          )}
          <V2VisualChevronRow
            icon={<Calendar className="h-4 w-4" />}
            label="超標後分攤天數"
            value={`${bankDays} 天`}
            onClick={() =>
              openPicker({
                key: 'bankdays',
                title: '超標後分攤天數',
                options: BANK_DAYS,
                value: bankDays,
                onSelect: setBankDays,
              })
            }
          />
          <V2VisualChevronRow
            icon={<Gauge className="h-4 w-4" />}
            label="回補強度"
            value={labelOf(BANK_INTENSITY, bankIntensity)}
            onClick={() =>
              openPicker({
                key: 'bankint',
                title: '回補強度',
                options: BANK_INTENSITY,
                value: bankIntensity,
                onSelect: setBankIntensity,
              })
            }
          />
        </V2SettingsVisualCard>
      </V2SettingsVisualShell>

      {picker && (
        <V2VisualPickerSheet
          open
          title={picker.title}
          options={picker.options}
          value={picker.value}
          onSelect={picker.onSelect}
          onClose={closePicker}
        />
      )}
    </>
  )
}
