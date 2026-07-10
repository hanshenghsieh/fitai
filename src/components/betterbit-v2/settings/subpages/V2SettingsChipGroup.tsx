'use client'

import { BB_V2 } from '@/lib/betterbit-v2'

interface Props {
  options: { value: string; label: string }[]
  value: string[]
  onChange: (next: string[]) => void
}

export default function V2SettingsChipGroup({ options, value, onChange }: Props) {
  function toggle(v: string) {
    onChange(value.includes(v) ? value.filter(x => x !== v) : [...value, v])
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const active = value.includes(opt.value)
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className="px-3 py-1.5 rounded-full text-[13px] touch-manipulation v2-settings-row--interactive"
            style={{
              backgroundColor: active ? BB_V2.bg.softGreen : BB_V2.bg.pill,
              color: active ? BB_V2.accent.green : BB_V2.text.secondary,
              border: `1px solid ${active ? BB_V2.accent.green : BB_V2.divider}`,
              fontWeight: active ? 600 : 500,
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
