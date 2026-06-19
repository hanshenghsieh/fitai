'use client'

import { toast } from 'sonner'
import { colors } from '@/lib/design-system'
import { LIFE_EVENT_OPTIONS, type LifeEventMode } from '@/lib/human-mode'
import { getLifeEventClearLine, getLifeEventWelcome } from '@/lib/life-event-copy'
import ZaiJian from '@/components/character/ZaiJian'

interface Props {
  active: LifeEventMode | null | undefined
  onSelect: (mode: LifeEventMode | null) => void
}

export default function LifeEventPicker({ active, onSelect }: Props) {
  function pick(mode: LifeEventMode) {
    if (active === mode) {
      onSelect(null)
      const line = getLifeEventClearLine()
      toast.message(line.text, { description: line.subtext })
      return
    }
    onSelect(mode)
    const line = getLifeEventWelcome(mode)
    toast.message(line.text, { description: line.subtext, duration: 5000 })
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold" style={{ color: colors.text.tertiary }}>
        生活模式（點一下，不懲罰）
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {LIFE_EVENT_OPTIONS.map(opt => {
          const selected = active === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => pick(opt.id)}
              className="flex-shrink-0 px-3 py-2 rounded-xl text-[12px] font-medium whitespace-nowrap"
              style={{
                backgroundColor: selected ? colors.accent.action : colors.bg.muted,
                color: selected ? '#FFFDF9' : colors.text.secondary,
                border: `1px solid ${selected ? colors.accent.action : colors.border.subtle}`,
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
      {active && (
        <ZaiJian size="xs" layout="inline" line={getLifeEventWelcome(active)} />
      )}
    </div>
  )
}
