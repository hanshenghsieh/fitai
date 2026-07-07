'use client'

import { BB_V2 } from '@/lib/betterbit-v2'
import BBCard from '@/components/ui/BBCard'
import ProgressWeightLog from '@/components/progress/ProgressWeightLog'

interface Props {
  lastWeightKg?: number | null
  onSaved?: (weightKg: number) => void | Promise<void>
}

/** Standalone weight log — no Recharts dependency (safe on Capacitor). */
export default function ProgressWeightBlock({ lastWeightKg, onSaved }: Props) {
  return (
    <BBCard padding={16} style={{ border: `1px solid ${BB_V2.divider}` }}>
      <ProgressWeightLog embedded lastWeightKg={lastWeightKg} onSaved={onSaved} />
    </BBCard>
  )
}
