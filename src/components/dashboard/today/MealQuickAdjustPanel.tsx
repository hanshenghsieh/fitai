'use client'

import { BB_V2 } from '@/lib/betterbit-v2'
import type { MealQuickAdjust, QuickAmountLevel, MealPortionSize, EatenLevel } from '@/lib/nutrition/home-cooked/types'

interface ChipOption<T extends string> {
  id: T
  label: string
}

function ChipRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: ChipOption<T>[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <section className="space-y-2">
      <p className="text-[13px]" style={{ color: BB_V2.text.secondary, fontWeight: 500 }}>
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const active = value === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className="px-3.5 h-10 rounded-full text-[14px]"
              style={{
                backgroundColor: active ? BB_V2.accent.orange : BB_V2.bg.canvas,
                color: active ? '#FFF' : BB_V2.text.secondary,
                fontWeight: active ? 600 : 400,
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </section>
  )
}

const PORTION_OPTIONS: ChipOption<MealPortionSize>[] = [
  { id: 'small', label: '小份' },
  { id: 'normal', label: '正常' },
  { id: 'large', label: '大份' },
]

const AMOUNT_OPTIONS: ChipOption<QuickAmountLevel>[] = [
  { id: 'less', label: '少' },
  { id: 'normal', label: '正常' },
  { id: 'more', label: '多' },
]

const RICE_OPTIONS: ChipOption<QuickAmountLevel>[] = [
  { id: 'less', label: '少飯' },
  { id: 'normal', label: '正常' },
  { id: 'more', label: '飯多' },
]

const EATEN_OPTIONS: ChipOption<EatenLevel>[] = [
  { id: 'all', label: '吃完' },
  { id: 'half', label: '吃一半' },
  { id: 'little_left', label: '剩一點' },
]

interface Props {
  value: MealQuickAdjust
  onChange: (next: MealQuickAdjust) => void
  showRice?: boolean
  showMeat?: boolean
  showSauce?: boolean
}

export default function MealQuickAdjustPanel({
  value,
  onChange,
  showRice = true,
  showMeat = true,
  showSauce = true,
}: Props) {
  return (
    <div className="space-y-4">
      <ChipRow
        label="份量"
        options={PORTION_OPTIONS}
        value={value.mealPortion}
        onChange={mealPortion => onChange({ ...value, mealPortion })}
      />
      {showRice ? (
        <ChipRow
          label="飯量"
          options={RICE_OPTIONS}
          value={value.riceLevel}
          onChange={riceLevel => onChange({ ...value, riceLevel })}
        />
      ) : null}
      {showMeat ? (
        <ChipRow
          label="肉量"
          options={AMOUNT_OPTIONS}
          value={value.meatLevel}
          onChange={meatLevel => onChange({ ...value, meatLevel })}
        />
      ) : null}
      {showSauce ? (
        <ChipRow
          label="醬量"
          options={AMOUNT_OPTIONS}
          value={value.sauceAmount}
          onChange={sauceAmount => onChange({ ...value, sauceAmount })}
        />
      ) : null}
      <ChipRow
        label="是否吃完"
        options={EATEN_OPTIONS}
        value={value.eatenLevel}
        onChange={eatenLevel => onChange({ ...value, eatenLevel })}
      />
    </div>
  )
}
