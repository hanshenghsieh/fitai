'use client'

import { ChevronRight } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import type { MealStrategyRow } from '@/lib/analytics/week-meal-strategy'
import type { WorkoutStrategyRow } from '@/lib/analytics/week-workout-strategy'
import BBIcon from '@/components/icons/BBIcon'
import { MEAL_SLOT_ICON, WORKOUT_TYPE_ICON } from '@/components/icons'
import BBCard from '@/components/ui/BBCard'

function StrategyCard({
  title,
  rows,
}: {
  title: string
  rows: { iconName: import('@/components/icons').BBIconName; label: string; instruction: string }[]
}) {
  return (
    <BBCard padding={16} className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[15px]" style={{ color: 'var(--bb-text-primary)', fontWeight: 700 }}>
          {title}
        </h3>
        <ChevronRight className="bb-icon h-4 w-4" strokeWidth={2} />
      </div>
      <ul className="space-y-2.5">
        {rows.map(row => (
          <li key={row.label} className="flex items-start gap-2 text-[13px]">
            <BBIcon name={row.iconName} size={18} tone="accent" className="mt-0.5 shrink-0" />
            <div className="min-w-0">
              <span style={{ color: 'var(--bb-text-primary)', fontWeight: 600 }}>{row.label}：</span>
              <span style={{ color: 'var(--bb-text-secondary)' }}>{row.instruction}</span>
            </div>
          </li>
        ))}
      </ul>
    </BBCard>
  )
}

export default function WeekStrategyRow({
  mealStrategy,
  workoutStrategy,
}: {
  mealStrategy: MealStrategyRow[]
  workoutStrategy: WorkoutStrategyRow[]
}) {
  if (!mealStrategy.length && !workoutStrategy.length) return null
  return (
    <section className="flex flex-col sm:flex-row gap-3">
      {mealStrategy.length > 0 && (
        <StrategyCard
          title="下週配餐策略"
          rows={mealStrategy.map(m => ({
            iconName: MEAL_SLOT_ICON[m.slot],
            label: m.slotLabel,
            instruction: m.instruction,
          }))}
        />
      )}
      {workoutStrategy.length > 0 && (
        <StrategyCard
          title="本週運動策略"
          rows={workoutStrategy.map(w => ({
            iconName: WORKOUT_TYPE_ICON[w.type],
            label: w.typeLabel,
            instruction: w.instruction,
          }))}
        />
      )}
    </section>
  )
}
