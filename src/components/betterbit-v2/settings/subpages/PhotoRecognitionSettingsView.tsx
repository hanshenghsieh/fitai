'use client'

import { useState } from 'react'
import {
  Camera,
  Package,
  ShieldCheck,
  Sparkles,
  Scale,
  BellRing,
  UtensilsCrossed,
} from 'lucide-react'
import type { SettingsBundle } from '@/lib/app/settings-data'
import type { PhotoSettings } from '@/lib/settings/user-settings-types'
import { invalidatePhotoSettingsCache } from '@/lib/settings/photo-settings-runtime'
import { useSettingsDirtyTracker, useSettingsSave } from '@/hooks/useSettingsForm'
import V2SettingsVisualShell from '@/components/betterbit-v2/settings/visual-v2/V2SettingsVisualShell'
import V2SettingsVisualCard from '@/components/betterbit-v2/settings/visual-v2/V2SettingsVisualCard'
import {
  V2VisualChevronRow,
  V2VisualSegmentField,
  V2VisualToggleRow,
  V2VisualInfoBar,
  V2VisualPickerSheet,
  useVisualPicker,
  labelOf,
} from '@/components/betterbit-v2/settings/visual-v2/V2SettingsVisualPrimitives'

const RECOGNITION_MODES = [
  { value: 'fast', label: '快速' },
  { value: 'standard', label: '標準' },
  { value: 'precise', label: '精準' },
]

const CONFIRM_MODES = [
  { value: 'always', label: '每次確認' },
  { value: 'low_confidence', label: '只在低信心時確認' },
  { value: 'auto', label: '自動加入' },
]

const MEAL_SLOT_OPTIONS = [
  { value: 'auto', label: '依時間自動' },
  { value: 'manual', label: '手動選擇' },
  { value: 'meal1', label: '早餐' },
  { value: 'meal2', label: '午餐' },
  { value: 'meal3', label: '晚餐' },
  { value: 'other', label: '點心' },
  { value: 'before_sleep', label: '宵夜' },
]

const PORTION_UNITS = [
  { value: 'g', label: '公克' },
  { value: 'serving', label: '份' },
  { value: 'bowl', label: '碗' },
  { value: 'plate', label: '盤' },
  { value: 'piece', label: '個' },
]

export default function PhotoRecognitionSettingsView({ initial }: { initial: SettingsBundle }) {
  const [p, setP] = useState<PhotoSettings>(initial.preferences.photo!)
  const { picker, openPicker, closePicker } = useVisualPicker()

  function patch<K extends keyof PhotoSettings>(key: K, value: PhotoSettings[K]) {
    setP(prev => ({ ...prev, [key]: value }))
  }

  const { isDirty, markSaved } = useSettingsDirtyTracker(p)

  const { saving, save: handleSave } = useSettingsSave({
    onSave: async () => {
      const res = await fetch('/api/settings/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo: p }),
      })
      const data = await res.json()
      if (!res.ok && res.status !== 503) throw new Error(data.error || '儲存失敗')
      invalidatePhotoSettingsCache()
    },
    onSuccess: markSaved,
    successMessage: '設定已更新',
  })

  const recognitionHelper =
    p.recognition_mode === 'precise'
      ? '精準模式偏好已儲存；完整精準辨識將在後續版本逐步接入。'
      : '快速 / 標準模式會先儲存偏好，後續版本逐步接 AI 流程。'

  return (
    <>
      <V2SettingsVisualShell
        title="拍照辨識設定"
        subtitle="調整拍照辨識的精準度、預設份量與確認流程。"
        saveLabel="儲存拍照設定"
        onSave={handleSave}
        saving={saving}
        saveDisabled={!isDirty}
        isDirty={isDirty}
        footerExtra={
          <V2VisualInfoBar>拍照後你仍可手動調整食物、份量與餐別。</V2VisualInfoBar>
        }
      >
        <V2SettingsVisualCard icon={<Camera className="h-4 w-4" />} title="辨識偏好" staggerIndex={0}>
          <V2VisualSegmentField
            label="辨識模式"
            helper={recognitionHelper}
            options={RECOGNITION_MODES}
            value={p.recognition_mode}
            onChange={v => patch('recognition_mode', v as PhotoSettings['recognition_mode'])}
          />
          <V2VisualChevronRow
            icon={<Sparkles className="h-4 w-4" />}
            label="拍照後是否需要確認"
            value={labelOf(CONFIRM_MODES, p.confirm_mode)}
            onClick={() =>
              openPicker({
                key: 'confirm',
                title: '拍照後是否需要確認',
                options: CONFIRM_MODES,
                value: p.confirm_mode,
                onSelect: v => patch('confirm_mode', v as PhotoSettings['confirm_mode']),
              })
            }
          />
          <V2VisualToggleRow
            icon={<BellRing className="h-4 w-4" />}
            label="低信心提醒"
            helper="使用 AI 回傳的 nutrition_confidence；若無信心資料會保守提醒。"
            checked={p.low_confidence_alert}
            onChange={v => patch('low_confidence_alert', v)}
          />
          <V2VisualChevronRow
            icon={<UtensilsCrossed className="h-4 w-4" />}
            label="預設餐別"
            value={labelOf(MEAL_SLOT_OPTIONS, p.default_meal_slot)}
            onClick={() =>
              openPicker({
                key: 'meal',
                title: '預設餐別',
                options: MEAL_SLOT_OPTIONS,
                value: p.default_meal_slot,
                onSelect: v => patch('default_meal_slot', v as PhotoSettings['default_meal_slot']),
              })
            }
          />
        </V2SettingsVisualCard>

        <V2SettingsVisualCard icon={<Package className="h-4 w-4" />} title="份量設定" staggerIndex={1}>
          <V2VisualChevronRow
            icon={<Scale className="h-4 w-4" />}
            label="預設份量單位"
            value={labelOf(PORTION_UNITS, p.portion_unit)}
            onClick={() =>
              openPicker({
                key: 'portion',
                title: '預設份量單位',
                options: PORTION_UNITS,
                value: p.portion_unit,
                onSelect: v => patch('portion_unit', v as PhotoSettings['portion_unit']),
              })
            }
          />
          <V2VisualToggleRow
            icon={<Sparkles className="h-4 w-4" />}
            label="份量估算提示"
            checked={p.portion_hint}
            onChange={v => patch('portion_hint', v)}
          />
          <V2VisualToggleRow
            icon={<Scale className="h-4 w-4" />}
            label="拍照後顯示份量選擇"
            checked={p.show_portion_picker}
            onChange={v => patch('show_portion_picker', v)}
          />
        </V2SettingsVisualCard>

        <V2SettingsVisualCard icon={<ShieldCheck className="h-4 w-4" />} title="資料品質" staggerIndex={2}>
          <V2VisualToggleRow
            icon={<ShieldCheck className="h-4 w-4" />}
            label="優先使用品牌菜單資料"
            checked={p.prefer_brand_menu}
            onChange={v => patch('prefer_brand_menu', v)}
          />
          <V2VisualToggleRow
            icon={<Sparkles className="h-4 w-4" />}
            label="找不到品牌時允許估算"
            checked={p.allow_estimate_fallback}
            onChange={v => patch('allow_estimate_fallback', v)}
          />
          <V2VisualToggleRow
            icon={<BellRing className="h-4 w-4" />}
            label="顯示可信度"
            helper="在辨識結果顯示資料來源與信心等級（若 API 有提供）。"
            checked={p.show_confidence}
            onChange={v => patch('show_confidence', v)}
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
