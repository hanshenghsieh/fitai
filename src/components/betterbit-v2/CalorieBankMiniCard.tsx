'use client'

import { useState } from 'react'
import { ChevronRight, Landmark } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import type { CalorieBankRow } from '@/lib/banks/calorie-bank-types'
import type { DailyExcessDriver } from '@/lib/engines/calorie-bank-engine'
import {
  getCalorieBankMiniCopy,
  resolveCalorieBankMiniState,
  shouldShowCalorieBankMini,
} from '@/lib/calorie-bank-v2-ui'
import { apiFetch } from '@/lib/api/client'
import { invalidateUserPreferencesCache } from '@/lib/settings/calorie-bank-user-prefs'
import type { UserSettingsPreferences } from '@/lib/settings/user-settings-types'
import CalorieBankDetailView from './CalorieBankDetailView'

interface Props {
  bank?: CalorieBankRow | null
  excessDriver?: DailyExcessDriver | null
  overTarget?: boolean
  calorieFloor?: number
  embedded?: boolean
  onPreferencesChange?: (preferences: UserSettingsPreferences) => void
}

export default function CalorieBankMiniCard({
  bank,
  excessDriver = null,
  overTarget = false,
  calorieFloor,
  embedded = false,
  onPreferencesChange,
}: Props) {
  const [open, setOpen] = useState(false)

  if (!bank || !shouldShowCalorieBankMini(bank, overTarget)) return null

  const state = resolveCalorieBankMiniState(bank, overTarget)!
  const copy = getCalorieBankMiniCopy(state)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`v2-calorie-bank-mini w-full text-left flex items-center gap-3 px-4 py-3.5 touch-manipulation ${embedded ? 'mt-3' : ''}`}
        style={{
          minHeight: 80,
          borderRadius: embedded ? 22 : 24,
          background: `linear-gradient(135deg, ${BB_V2.bg.softGreen} 0%, rgba(255,255,255,0.94) 100%)`,
          border: `1px solid ${BB_V2.accent.greenSoftBorder}`,
          boxShadow: embedded ? 'none' : '0 6px 20px rgba(18, 61, 36, 0.05)',
        }}
      >
        <div
          className="shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{
            background: `linear-gradient(145deg, ${BB_V2.accent.green} 0%, #2d6b31 100%)`,
            color: '#fff',
          }}
        >
          <Landmark className="h-5 w-5" strokeWidth={BB_V2.iconStroke} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-wide" style={{ color: BB_V2.accent.green, fontWeight: 700 }}>
            Calorie Bank
          </p>
          <p className="text-[14px] mt-0.5 leading-snug" style={{ color: BB_V2.text.deepGreen, fontWeight: 700 }}>
            {copy.headline}
          </p>
          <p className="text-[12px] mt-0.5 leading-relaxed line-clamp-2" style={{ color: BB_V2.text.secondary }}>
            {copy.body}
          </p>
        </div>

        <div className="shrink-0 flex flex-col items-end gap-1.5">
          <span
            className="text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap"
            style={{ backgroundColor: '#fff', color: BB_V2.accent.green, fontWeight: 600, border: `1px solid ${BB_V2.accent.greenSoftBorder}` }}
          >
            {copy.cta}
          </span>
          <ChevronRight className="h-4 w-4 v2-calorie-bank-chevron" style={{ color: BB_V2.text.muted }} />
        </div>
      </button>

      <CalorieBankDetailView
        bank={bank}
        excessDriver={excessDriver}
        miniState={state}
        calorieFloor={calorieFloor}
        open={open}
        onClose={() => setOpen(false)}
        onSavePlan={async spreadDays => {
          const response = await apiFetch('/api/settings/preferences', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ calorie_bank_days: spreadDays }),
          })
          if (!response.ok) return false
          const data = (await response.json()) as {
            preferences?: UserSettingsPreferences
          }
          if (!data.preferences) return false
          invalidateUserPreferencesCache()
          onPreferencesChange?.(data.preferences)
          return true
        }}
      />
    </>
  )
}
