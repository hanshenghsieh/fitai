'use client'

import { RefreshCw, Sparkles } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import V2Card from './V2Card'
import V2ProgressRing from './V2ProgressRing'
import V2NutrientTile from './V2NutrientTile'
import V2CoachNote from './V2CoachNote'
import V2PrimaryButton from './V2PrimaryButton'

export interface PhotoAnalysisV2Props {
  photoUrl: string
  mealLabel: string
  timeLabel: string
  calories: number
  caloriesTarget: number
  proteinG: number
  proteinTarget: number
  carbsG: number
  carbsTarget: number
  fatG: number
  fatTarget: number
  fiberG?: number | null
  ratingLabel?: string
  ratingAdvice?: string
  onRetake?: () => void
  onNextMeal?: () => void
  saving?: boolean
}

function pct(current: number, target: number) {
  if (!target) return 0
  return Math.min(100, Math.round((current / target) * 100))
}

export default function PhotoAnalysisV2View({
  photoUrl,
  mealLabel,
  timeLabel,
  calories,
  caloriesTarget,
  proteinG,
  proteinTarget,
  carbsG,
  carbsTarget,
  fatG,
  fatTarget,
  fiberG,
  ratingLabel = '良好',
  ratingAdvice = '蛋白質比例不錯，下一餐可以再多一點蔬菜 💚',
  onRetake,
  onNextMeal,
  saving,
}: PhotoAnalysisV2Props) {
  const goalPct = pct(calories, caloriesTarget)

  return (
    <div className="space-y-4">
      <div className="relative rounded-[24px] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoUrl} alt={mealLabel || '食物照片'} className="w-full aspect-[4/3] object-cover" />
        {onRetake && (
          <button
            type="button"
            onClick={onRetake}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] backdrop-blur-md"
            style={{ backgroundColor: 'rgba(255,255,255,0.92)', color: BB_V2.text.primary, fontWeight: 500 }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            重新辨識
          </button>
        )}
      </div>

      <V2Card padding="18px">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[15px]" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>
            {mealLabel}
          </span>
          <span className="text-[13px]" style={{ color: BB_V2.text.muted }}>
            {timeLabel}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px]" style={{ color: BB_V2.text.secondary }}>
              總熱量
            </p>
            <p className="text-[40px] tabular-nums leading-none mt-1" style={{ color: BB_V2.text.deepGreen, fontWeight: 700 }}>
              {Math.round(calories)}
              <span className="text-[16px] font-normal ml-1" style={{ color: BB_V2.text.secondary }}>
                kcal
              </span>
            </p>
          </div>
          <V2ProgressRing label="目標進度" value={goalPct} unit="%" consumed={calories} target={caloriesTarget} />
        </div>
      </V2Card>

      <div className="grid grid-cols-4 gap-2">
        <V2NutrientTile title="蛋白質" current={proteinG} target={proteinTarget} color={BB_V2.macro.protein} />
        <V2NutrientTile title="碳水" current={carbsG} target={carbsTarget} color={BB_V2.macro.carbs} />
        <V2NutrientTile title="脂肪" current={fatG} target={fatTarget} color={BB_V2.macro.fat} />
        <V2NutrientTile title="纖維" current={fiberG ?? 0} target={25} color={BB_V2.macro.fiber} />
      </div>

      <V2CoachNote
        icon={<Sparkles className="h-5 w-5" style={{ color: BB_V2.accent.green }} />}
        title={`飲食評分：${ratingLabel}`}
      >
        {ratingAdvice}
      </V2CoachNote>

      {onNextMeal && (
        <V2PrimaryButton onClick={onNextMeal} loading={saving}>
          拍攝下一餐
        </V2PrimaryButton>
      )}
    </div>
  )
}
