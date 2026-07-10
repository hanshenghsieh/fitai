'use client'

import { useState } from 'react'
import type { SettingsBundle } from '@/lib/app/settings-data'
import { useSettingsDirtyTracker, useSettingsSave } from '@/hooks/useSettingsForm'
import { BB_V2 } from '@/lib/betterbit-v2'
import V2SettingsSubpageShell from './V2SettingsSubpageShell'
import V2SettingsFormCard from './V2SettingsFormCard'

const LANGUAGES = [
  { value: 'zh-TW', label: '繁體中文', available: true },
  { value: 'en', label: 'English', available: false },
  { value: 'ja', label: '日本語', available: false },
  { value: 'ko', label: '한국어', available: false },
]

export default function LanguageSettingsView({ initial }: { initial: SettingsBundle }) {
  const [language, setLanguage] = useState(initial.preferences.language ?? 'zh-TW')

  const { isDirty, markSaved } = useSettingsDirtyTracker({ language })

  const { saving, save: handleSave } = useSettingsSave({
    onSave: async () => {
      const res = await fetch('/api/settings/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      })
      const data = await res.json()
      if (!res.ok && res.status !== 503) throw new Error(data.error || '儲存失敗')
    },
    onSuccess: markSaved,
  })

  return (
    <V2SettingsSubpageShell title="語言設定" subtitle="選擇你想使用的語言。" saveLabel="儲存語言設定" onSave={handleSave} saving={saving} saveDisabled={!isDirty} isDirty={isDirty}>
      <V2SettingsFormCard>
        <p className="text-[12px] -mt-1 mb-3" style={{ color: BB_V2.text.secondary }}>
          目前 App 僅完整支援繁體中文，其他語言即將開放，避免半套翻譯。
        </p>
        <div className="space-y-2">
          {LANGUAGES.map(lang => (
            <button
              key={lang.value}
              type="button"
              disabled={!lang.available}
              onClick={() => lang.available && setLanguage(lang.value)}
              className="w-full flex items-center justify-between px-3 py-3 rounded-xl text-left touch-manipulation v2-settings-row--interactive disabled:opacity-45"
              style={{
                backgroundColor: language === lang.value ? BB_V2.bg.softGreen : BB_V2.bg.pill,
                border: `1px solid ${language === lang.value ? BB_V2.accent.green : BB_V2.divider}`,
              }}
            >
              <span className="text-[15px]" style={{ color: BB_V2.text.primary, fontWeight: 600 }}>{lang.label}</span>
              {!lang.available && <span className="text-[12px]" style={{ color: BB_V2.text.muted }}>即將開放</span>}
            </button>
          ))}
        </div>
      </V2SettingsFormCard>
    </V2SettingsSubpageShell>
  )
}
