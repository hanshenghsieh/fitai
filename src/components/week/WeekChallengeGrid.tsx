'use client'

import { BB_V2 } from '@/lib/betterbit-v2'
import type { WeeklyChallengeItem } from '@/lib/analytics/week-challenge'
import BBIcon from '@/components/icons/BBIcon'
import BBCard from '@/components/ui/BBCard'

export default function WeekChallengeGrid({ challenges }: { challenges: WeeklyChallengeItem[] }) {
  if (!challenges.length) return null
  return (
    <section>
      <h2 className="text-[17px] mb-3" style={{ color: 'var(--bb-text-primary)', fontWeight: 700 }}>
        本週挑戰
      </h2>
      <BBCard padding={16}>
        <div className="grid grid-cols-2 gap-4">
          {challenges.map(c => {
            const pct = c.target > 0 ? Math.min(100, (c.current / c.target) * 100) : 0
            return (
              <div
                key={c.id}
                className="rounded-2xl p-3"
                style={{
                  backgroundColor: c.done
                    ? 'var(--bb-surface-success)'
                    : pct >= 50
                      ? 'var(--bb-surface-warning)'
                      : 'var(--bb-surface-neutral)',
                }}
              >
                <div className="flex items-start gap-2 mb-2">
                  <span
                    className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center"
                    style={{
                      border: `2px solid ${c.done ? 'var(--bb-icon-color-success)' : 'var(--bb-text-secondary)'}`,
                    }}
                  >
                    {c.done && <BBIcon name="success" size={12} tone="success" aria-hidden />}
                  </span>
                  <p className="text-[13px] leading-snug" style={{ color: 'var(--bb-text-primary)', fontWeight: 500 }}>
                    {c.label}
                  </p>
                </div>
                <p className="text-[12px] mb-1 tabular-nums" style={{ color: 'var(--bb-text-secondary)' }}>
                  {c.current} / {c.target} {c.unit}
                </p>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: BB_V2.bg.pill }}>
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: c.done
                        ? 'var(--bb-icon-color-success)'
                        : pct >= 50
                          ? 'var(--bb-icon-color-accent)'
                          : 'var(--bb-icon-color-warning)',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </BBCard>
    </section>
  )
}
