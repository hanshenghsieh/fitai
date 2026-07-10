'use client'

import { Check } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'

interface Option {
  id: string
  label: string
}

interface Props {
  options: Option[]
  value: string
  onChange: (id: string) => void
}

export default function V2SegmentedControl({ options, value, onChange }: Props) {
  return (
    <div className="flex gap-2">
      {options.map(opt => {
        const active = opt.id === value
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className="flex-1 relative py-3 px-2 rounded-2xl text-[15px] touch-manipulation transition-colors"
            style={{
              backgroundColor: active ? BB_V2.bg.softGreen : BB_V2.bg.card,
              border: `1.5px solid ${active ? BB_V2.accent.green : BB_V2.border}`,
              color: active ? BB_V2.text.deepGreen : BB_V2.text.secondary,
              fontWeight: active ? 600 : 400,
            }}
          >
            {active && (
              <Check
                className="absolute top-2 right-2 h-3.5 w-3.5"
                strokeWidth={2.5}
                style={{ color: BB_V2.accent.green }}
              />
            )}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
