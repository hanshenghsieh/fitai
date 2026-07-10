'use client'

import { useState } from 'react'
import {
  UtensilsCrossed,
  AlertTriangle,
  Store,
  EyeOff,
  Sun,
  MapPin,
  Smile,
  DollarSign,
} from 'lucide-react'
import type { SettingsBundle } from '@/lib/app/settings-data'
import { useSettingsDirtyTracker, useSettingsSave } from '@/hooks/useSettingsForm'
import V2SettingsVisualShell from '@/components/betterbit-v2/settings/visual-v2/V2SettingsVisualShell'
import V2SettingsVisualCard from '@/components/betterbit-v2/settings/visual-v2/V2SettingsVisualCard'
import {
  V2VisualChipGroup,
  V2VisualTagInput,
  V2VisualChevronRow,
  V2VisualInfoBar,
  V2VisualMultiPickerSheet,
  V2VisualPickerSheet,
  useVisualPicker,
  labelOf,
  labelsOf,
} from '@/components/betterbit-v2/settings/visual-v2/V2SettingsVisualPrimitives'

const RESTRICTIONS = [
  { value: 'no_beef', label: '不吃牛' },
  { value: 'no_pork', label: '不吃豬' },
  { value: 'no_chicken', label: '不吃雞' },
  { value: 'no_seafood', label: '不吃海鮮' },
  { value: 'no_egg', label: '不吃蛋' },
  { value: 'no_dairy', label: '不喝奶' },
  { value: 'vegetarian', label: '素食' },
  { value: 'ovo_lacto', label: '蛋奶素' },
  { value: 'low_carb', label: '低碳' },
  { value: 'high_protein', label: '高蛋白' },
  { value: 'low_sodium', label: '低鈉' },
]

const ALLERGENS = [
  { value: 'peanut', label: '花生' },
  { value: 'nuts', label: '堅果' },
  { value: 'milk', label: '牛奶' },
  { value: 'egg', label: '蛋' },
  { value: 'shellfish', label: '甲殼類' },
  { value: 'fish', label: '魚類' },
  { value: 'soy', label: '大豆' },
  { value: 'wheat', label: '小麥' },
  { value: 'sesame', label: '芝麻' },
]

const MEAL_TIMES = [
  { value: 'breakfast', label: '早餐' },
  { value: 'lunch', label: '午餐' },
  { value: 'dinner', label: '晚餐' },
  { value: 'snack', label: '點心' },
  { value: 'late', label: '宵夜' },
]

const LOCATIONS = [
  { value: 'convenience', label: '便利商店' },
  { value: 'bento', label: '便當店' },
  { value: 'buffet', label: '自助餐' },
  { value: 'mcd', label: '麥當勞' },
  { value: 'subway', label: 'Subway' },
  { value: 'hotpot', label: '火鍋' },
  { value: 'luwei', label: '滷味' },
  { value: 'breakfast_shop', label: '早餐店' },
  { value: 'home_cook', label: '自煮' },
]

const TASTE_OPTIONS = [
  { value: 'light', label: '清淡' },
  { value: 'normal', label: '正常' },
  { value: 'heavy', label: '重口味' },
  { value: 'no_spicy', label: '不辣' },
  { value: 'mild_spicy', label: '微辣' },
  { value: 'spicy', label: '辣' },
]

const BUDGET_OPTIONS = [
  { value: 'low', label: '100 以下' },
  { value: 'medium', label: '100–200' },
  { value: 'high', label: '200–300' },
  { value: 'very_high', label: '300 以上' },
]

export default function DietPreferencesSettingsView({ initial }: { initial: SettingsBundle }) {
  const extras = initial.preferences.diet_extras!
  const { picker, openPicker, closePicker } = useVisualPicker()
  const [multiPicker, setMultiPicker] = useState<{
    key: string
    title: string
    options: { value: string; label: string }[]
    value: string[]
    onSelect: (v: string[]) => void
  } | null>(null)

  const [restrictions, setRestrictions] = useState<string[]>(extras.diet_restrictions ?? [])
  const [allergens, setAllergens] = useState<string[]>(initial.profile.allergens ?? [])
  const [mealTimes, setMealTimes] = useState<string[]>(extras.favorite_meal_times ?? [])
  const [locations, setLocations] = useState<string[]>(extras.favorite_locations ?? [])
  const [taste, setTaste] = useState(extras.taste_preference ?? 'normal')
  const [budget, setBudget] = useState(initial.profile.food_budget ?? 'medium')
  const [blockedTags, setBlockedTags] = useState<string[]>(
    extras.blocked_foods?.length
      ? extras.blocked_foods
      : (initial.profile.disliked_foods ?? [])
  )

  const formSnapshot = { restrictions, allergens, mealTimes, locations, taste, budget, blockedTags }
  const { isDirty, markSaved } = useSettingsDirtyTracker(formSnapshot)

  const { saving, save: handleSave } = useSettingsSave({
    onSave: async () => {
      const profileRes = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_vegetarian: restrictions.includes('vegetarian'),
          is_vegan:
            restrictions.includes('vegetarian') &&
            restrictions.includes('no_dairy') &&
            restrictions.includes('no_egg'),
          is_halal: restrictions.includes('no_pork'),
          allergens,
          disliked_foods: blockedTags,
          food_budget: budget,
        }),
      })
      if (!profileRes.ok) {
        const d = await profileRes.json()
        throw new Error(d.error || 'profile save failed')
      }

      const prefRes = await fetch('/api/settings/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diet_extras: {
            diet_restrictions: restrictions,
            favorite_meal_times: mealTimes,
            favorite_locations: locations,
            taste_preference: taste,
            budget_range: budget,
            blocked_foods: blockedTags,
          },
        }),
      })
      if (!prefRes.ok && prefRes.status !== 503) {
        const d = await prefRes.json()
        throw new Error(d.error || 'preferences save failed')
      }
    },
    onSuccess: markSaved,
    successMessage: '設定已更新',
  })

  return (
    <>
      <V2SettingsVisualShell
        title="飲食偏好"
        subtitle="告訴 BetterBit 你喜歡什麼、不吃什麼，推薦會更貼近你的生活。"
        saveLabel="儲存飲食偏好"
        onSave={handleSave}
        saving={saving}
        saveDisabled={!isDirty}
        isDirty={isDirty}
        footerExtra={
          <V2VisualInfoBar>
            BetterBit 會優先避開你不喜歡或不吃的選項，讓推薦更貼近你的生活。
          </V2VisualInfoBar>
        }
      >
        <V2SettingsVisualCard icon={<UtensilsCrossed className="h-4 w-4" />} title="飲食限制" staggerIndex={0}>
          <V2VisualChipGroup options={RESTRICTIONS} value={restrictions} onChange={setRestrictions} />
        </V2SettingsVisualCard>

        <V2SettingsVisualCard icon={<AlertTriangle className="h-4 w-4" />} title="過敏原" staggerIndex={1}>
          <p className="v2-sv2-card-helper">
            過敏原資訊可能不完整，請以餐廳或食品標示為準。
          </p>
          <V2VisualChipGroup options={ALLERGENS} value={allergens} onChange={setAllergens} />
        </V2SettingsVisualCard>

        <V2SettingsVisualCard icon={<Store className="h-4 w-4" />} title="外食偏好" staggerIndex={2}>
          <V2VisualChevronRow
            icon={<Sun className="h-4 w-4" />}
            label="常吃餐別"
            value={labelsOf(MEAL_TIMES, mealTimes)}
            onClick={() =>
              setMultiPicker({
                key: 'meals',
                title: '常吃餐別',
                options: MEAL_TIMES,
                value: mealTimes,
                onSelect: setMealTimes,
              })
            }
          />
          <V2VisualChevronRow
            icon={<MapPin className="h-4 w-4" />}
            label="常吃地點"
            value={labelsOf(LOCATIONS, locations)}
            onClick={() =>
              setMultiPicker({
                key: 'locations',
                title: '常吃地點',
                options: LOCATIONS,
                value: locations,
                onSelect: setLocations,
              })
            }
          />
          <V2VisualChevronRow
            icon={<Smile className="h-4 w-4" />}
            label="喜歡的口味"
            value={labelOf(TASTE_OPTIONS, taste)}
            onClick={() =>
              openPicker({
                key: 'taste',
                title: '喜歡的口味',
                options: TASTE_OPTIONS,
                value: taste,
                onSelect: setTaste,
              })
            }
          />
          <V2VisualChevronRow
            icon={<DollarSign className="h-4 w-4" />}
            label="預算"
            value={labelOf(BUDGET_OPTIONS, budget)}
            onClick={() =>
              openPicker({
                key: 'budget',
                title: '預算',
                options: BUDGET_OPTIONS,
                value: budget,
                onSelect: setBudget,
              })
            }
          />
        </V2SettingsVisualCard>

        <V2SettingsVisualCard icon={<EyeOff className="h-4 w-4" />} title="不想看到的食物" staggerIndex={3}>
          <V2VisualTagInput tags={blockedTags} onChange={setBlockedTags} />
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

      {multiPicker && (
        <V2VisualMultiPickerSheet
          open
          title={multiPicker.title}
          options={multiPicker.options}
          value={multiPicker.value}
          onSelect={multiPicker.onSelect}
          onClose={() => setMultiPicker(null)}
        />
      )}
    </>
  )
}
