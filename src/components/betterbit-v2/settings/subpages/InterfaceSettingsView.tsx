'use client'

import { useState } from 'react'
import {
  LayoutGrid,
  Paintbrush,
  Moon,
  Flame,
  Hash,
  Leaf,
  Grid3x3,
  Droplets,
  Camera,
  Sparkles,
  FastForward,
  Type,
} from 'lucide-react'
import type { SettingsBundle } from '@/lib/app/settings-data'
import type { UiSettings } from '@/lib/settings/user-settings-types'
import { useSettingsDirtyTracker, useSettingsSave } from '@/hooks/useSettingsForm'
import { applyUiPreferencesRuntime } from '@/lib/settings/ui-preferences-runtime'
import V2SettingsVisualShell from '@/components/betterbit-v2/settings/visual-v2/V2SettingsVisualShell'
import V2SettingsVisualCard from '@/components/betterbit-v2/settings/visual-v2/V2SettingsVisualCard'
import {
  V2VisualChevronRow,
  V2VisualToggleRow,
  V2VisualInfoBar,
  V2VisualInterfacePreview,
} from '@/components/betterbit-v2/settings/visual-v2/V2SettingsVisualPrimitives'
import { apiFetch } from '@/lib/api/client'

export default function InterfaceSettingsView({ initial }: { initial: SettingsBundle }) {
  const [ui, setUi] = useState<UiSettings>({
    ...initial.preferences.ui!,
    theme_color: initial.preferences.ui?.theme_color ?? 'betterbit_green',
    animations_enabled: initial.preferences.ui?.animations_enabled ?? true,
    dark_mode: initial.preferences.ui?.dark_mode ?? false,
    reduced_motion: initial.preferences.ui?.reduced_motion ?? false,
    large_text: initial.preferences.ui?.large_text ?? false,
  })
  const { isDirty, markSaved } = useSettingsDirtyTracker(ui)

  const { saving, save: handleSave } = useSettingsSave({
    onSave: async () => {
      const res = await apiFetch('/api/settings/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ui }),
      })
      const data = await res.json()
      if (!res.ok && res.status !== 503) throw new Error(data.error || '儲存失敗')
      applyUiPreferencesRuntime(ui)
    },
    onSuccess: markSaved,
    successMessage: '設定已更新',
  })

  function setField<K extends keyof UiSettings>(key: K, value: UiSettings[K]) {
    setUi(prev => ({ ...prev, [key]: value }))
  }

  return (
    <>
      <V2SettingsVisualShell
        title="介面設定"
        subtitle="調整 Betterbit 的顯示方式，讓你看得更舒服。"
        saveLabel="儲存介面設定"
        onSave={handleSave}
        saving={saving}
        saveDisabled={!isDirty}
        isDirty={isDirty}
        footerExtra={
          <V2VisualInfoBar>這些設定會影響顯示方式，不會改變你的飲食與分析資料。</V2VisualInfoBar>
        }
      >
        <V2SettingsVisualCard icon={<LayoutGrid className="h-4 w-4" />} title="首頁顯示" staggerIndex={0}>
          <V2VisualChevronRow
            icon={<Flame className="h-4 w-4" />}
            label="首頁顯示重點"
            subtitle="即將推出"
            disabled
          />
          <V2VisualChevronRow
            icon={<Hash className="h-4 w-4" />}
            label="數字顯示"
            subtitle="即將推出"
            disabled
          />
          <V2VisualChevronRow
            icon={<Leaf className="h-4 w-4" />}
            label="營養素顯示"
            subtitle="即將推出"
            disabled
          />
        </V2SettingsVisualCard>

        <V2SettingsVisualCard icon={<Paintbrush className="h-4 w-4" />} title="畫面風格" staggerIndex={1}>
          <V2VisualChevronRow
            icon={<Grid3x3 className="h-4 w-4" />}
            label="卡片密度"
            subtitle="即將推出"
            disabled
          />
          <V2VisualChevronRow
            icon={<Droplets className="h-4 w-4" />}
            label="主題色調"
            subtitle="即將推出"
            disabled
          />
          <V2VisualChevronRow
            icon={<Camera className="h-4 w-4" />}
            label="底部主按鈕"
            subtitle="即將推出"
            disabled
          />
          <V2VisualToggleRow
            icon={<Sparkles className="h-4 w-4" />}
            label="動畫效果"
            checked={ui.animations_enabled !== false}
            onChange={v => setField('animations_enabled', v)}
          />
        </V2SettingsVisualCard>

        <V2SettingsVisualCard icon={<Moon className="h-4 w-4" />} title="深色模式與輔助" staggerIndex={2}>
          <V2VisualToggleRow
            icon={<Moon className="h-4 w-4" />}
            label="深色模式"
            helper="即將開放"
            checked={false}
            disabled
            onChange={() => {}}
          />
          <V2VisualToggleRow
            icon={<FastForward className="h-4 w-4" />}
            label="減少動畫"
            checked={Boolean(ui.reduced_motion)}
            onChange={v => setField('reduced_motion', v)}
          />
          <V2VisualToggleRow
            icon={<Type className="h-4 w-4" />}
            label="大字體樣式"
            helper="即將開放"
            checked={false}
            disabled
            onChange={() => {}}
          />
        </V2SettingsVisualCard>

        <V2SettingsVisualCard icon={<LayoutGrid className="h-4 w-4" />} title="預覽效果" staggerIndex={3}>
          <V2VisualInterfacePreview />
        </V2SettingsVisualCard>
      </V2SettingsVisualShell>

    </>
  )
}
