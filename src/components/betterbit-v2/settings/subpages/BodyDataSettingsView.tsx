'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Loader2, Plus, ChevronRight, Scale, Percent, Ruler, Flame, Calendar, ClipboardList, Clock, User } from 'lucide-react'
import { calculateBMR } from '@/lib/goal-calculator'
import type { SettingsBundle } from '@/lib/app/settings-data'
import { resolveLatestBodyMetrics } from '@/lib/settings/resolve-body-metrics'
import {
  parseOptionalNumber,
  validateBodyFatPct,
  validateWaistCm,
  validateWeightKg,
} from '@/lib/settings/settings-validation'
import { useSettingsDirtyTracker, useSettingsSave } from '@/hooks/useSettingsForm'
import type { BodyMeasurement, UserProfile } from '@/types'
import V2SettingsVisualShell from '@/components/betterbit-v2/settings/visual-v2/V2SettingsVisualShell'
import V2SettingsVisualCard from '@/components/betterbit-v2/settings/visual-v2/V2SettingsVisualCard'
import V2OverlayPortal from '@/components/betterbit-v2/settings/visual-v2/V2OverlayPortal'
import {
  V2VisualField,
  V2VisualInput,
  V2VisualMetricTile,
  V2VisualInfoBar,
} from '@/components/betterbit-v2/settings/visual-v2/V2SettingsVisualPrimitives'

function formatDisplayDate(iso: string) {
  const d = iso.slice(0, 10)
  const [y, m, day] = d.split('-')
  if (!y || !m || !day) return d
  return `${y} / ${m} / ${day}`
}

export default function BodyDataSettingsView({ initial }: { initial: SettingsBundle }) {
  const resolved = useMemo(
    () =>
      resolveLatestBodyMetrics({
        measurements: initial.measurements,
        profile: initial.profile,
        onboardingWeightKg: initial.goal?.start_weight_kg ?? null,
        onboardingBodyFatPct: initial.goal?.start_body_fat_pct ?? null,
      }),
    [initial]
  )

  const [adding, setAdding] = useState(false)
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>(initial.measurements)
  const [currentWeight, setCurrentWeight] = useState(resolved.weightKg != null ? String(resolved.weightKg) : '')
  const [currentBf, setCurrentBf] = useState(resolved.bodyFatPct != null ? String(resolved.bodyFatPct) : '')
  const [waist, setWaist] = useState(resolved.waistCm != null ? String(resolved.waistCm) : '')
  const [muscle, setMuscle] = useState(resolved.muscleMassKg != null ? String(resolved.muscleMassKg) : '')
  const [measuredDate, setMeasuredDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [newWeight, setNewWeight] = useState('')
  const [newBf, setNewBf] = useState('')
  const [newWaist, setNewWaist] = useState('')
  const [newNote, setNewNote] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const profileForBmr = useMemo(
    () => ({
      ...(initial.profile as UserProfile),
      weight_kg: parseOptionalNumber(currentWeight) ?? initial.profile.weight_kg,
    }),
    [initial.profile, currentWeight]
  )
  const bmr = useMemo(() => calculateBMR(profileForBmr), [profileForBmr])

  const recent = useMemo(() => [...measurements].reverse().slice(0, 5), [measurements])

  const currentFormSnapshot = { currentWeight, currentBf, waist, muscle, measuredDate }
  const { isDirty, markSaved } = useSettingsDirtyTracker(currentFormSnapshot)

  async function refreshMeasurements() {
    const res = await fetch('/api/measurements')
    if (!res.ok) return
    const data = await res.json()
    if (data.measurements) {
      setMeasurements(data.measurements)
      const latest = resolveLatestBodyMetrics({
        measurements: data.measurements,
        profile: initial.profile,
        onboardingWeightKg: initial.goal?.start_weight_kg ?? null,
        onboardingBodyFatPct: initial.goal?.start_body_fat_pct ?? null,
      })
      setCurrentWeight(latest.weightKg != null ? String(latest.weightKg) : '')
      setCurrentBf(latest.bodyFatPct != null ? String(latest.bodyFatPct) : '')
    }
  }

  const { saving, save: handleSaveCurrent } = useSettingsSave({
    validate: () => {
      const weightErr = validateWeightKg(parseOptionalNumber(currentWeight))
      if (weightErr) return weightErr
      const bfErr = validateBodyFatPct(parseOptionalNumber(currentBf))
      if (bfErr) return bfErr
      const waistErr = validateWaistCm(parseOptionalNumber(waist))
      if (waistErr) return waistErr
      return null
    },
    onSave: async () => {
      const res = await fetch('/api/settings/body', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight_kg: Number(currentWeight),
          body_fat_pct: currentBf ? Number(currentBf) : null,
          waist_cm: waist ? Number(waist) : null,
          muscle_mass_kg: muscle ? Number(muscle) : null,
          measured_at: measuredDate,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '儲存失敗')
      if (data.measurements) setMeasurements(data.measurements)
    },
    onSuccess: markSaved,
    successMessage: '身體數據已更新',
  })

  async function handleAddLog() {
    const weightErr = validateWeightKg(parseOptionalNumber(newWeight))
    if (weightErr) {
      toast.error(weightErr)
      return
    }
    setAdding(true)
    try {
      const res = await fetch('/api/settings/body', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight_kg: Number(newWeight),
          body_fat_pct: newBf ? Number(newBf) : null,
          waist_cm: newWaist ? Number(newWaist) : null,
          measured_at: format(new Date(), 'yyyy-MM-dd'),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '新增失敗')
      if (data.measurements) {
        setMeasurements(data.measurements)
        const latest = resolveLatestBodyMetrics({ measurements: data.measurements, profile: initial.profile })
        setCurrentWeight(latest.weightKg != null ? String(latest.weightKg) : '')
        setCurrentBf(latest.bodyFatPct != null ? String(latest.bodyFatPct) : '')
        markSaved()
      }
      setNewWeight('')
      setNewBf('')
      setNewWaist('')
      setNewNote('')
      toast.success('設定已更新')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '新增失敗')
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('確定刪除這筆量測紀錄？')) return
    const res = await fetch(`/api/measurements/${id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || '刪除失敗')
      return
    }
    await refreshMeasurements()
    toast.message('已刪除紀錄')
  }

  return (
    <>
      <V2SettingsVisualShell
        title="身體數據"
        subtitle="更新你的體重、體脂與身體狀態，讓熱量計算更準確。"
        saveLabel="儲存身體數據"
        onSave={handleSaveCurrent}
        saving={saving}
        saveDisabled={!isDirty}
        isDirty={isDirty}
        footerExtra={<V2VisualInfoBar>最新體重會同步到 Today 與 Analysis。</V2VisualInfoBar>}
      >
        <V2SettingsVisualCard icon={<User className="h-4 w-4" />} title="目前身體狀態" staggerIndex={0}>
          <div className="v2-sv2-metric-grid">
            <V2VisualMetricTile icon={<Scale className="h-3.5 w-3.5" />} label="目前體重" value={currentWeight || '—'} unit="kg" />
            <V2VisualMetricTile icon={<Percent className="h-3.5 w-3.5" />} label="目前體脂" value={currentBf || '—'} unit="%" />
            <V2VisualMetricTile icon={<Ruler className="h-3.5 w-3.5" />} label="腰圍" value={waist || '—'} unit="cm" />
            <V2VisualMetricTile icon={<Scale className="h-3.5 w-3.5" />} label="肌肉量" value={muscle || '—'} unit="kg" />
            <V2VisualMetricTile icon={<Flame className="h-3.5 w-3.5" />} label="基礎代謝率" value={String(bmr)} unit="kcal" hint="系統估算" />
            <V2VisualMetricTile icon={<Calendar className="h-3.5 w-3.5" />} label="量測日期" value={formatDisplayDate(measuredDate)} unit="" />
          </div>
        </V2SettingsVisualCard>

        <V2SettingsVisualCard icon={<ClipboardList className="h-4 w-4" />} title="新增量測紀錄" staggerIndex={1}>
          <V2VisualField label="體重">
            <div className="flex items-center gap-2">
              <V2VisualInput value={newWeight} onChange={setNewWeight} type="number" placeholder="69.0" />
              <span className="text-[13px] shrink-0" style={{ color: '#7a807a' }}>kg</span>
            </div>
          </V2VisualField>
          <V2VisualField label="體脂">
            <div className="flex items-center gap-2">
              <V2VisualInput value={newBf} onChange={setNewBf} type="number" placeholder="22" />
              <span className="text-[13px] shrink-0" style={{ color: '#7a807a' }}>%</span>
            </div>
          </V2VisualField>
          <V2VisualField label="腰圍">
            <div className="flex items-center gap-2">
              <V2VisualInput value={newWaist} onChange={setNewWaist} type="number" placeholder="82" />
              <span className="text-[13px] shrink-0" style={{ color: '#7a807a' }}>cm</span>
            </div>
          </V2VisualField>
          <V2VisualField label="備註">
            <V2VisualInput value={newNote} onChange={setNewNote} placeholder="早上空腹量測" />
          </V2VisualField>
          <button
            type="button"
            disabled={adding || !newWeight}
            onClick={() => void handleAddLog()}
            className="v2-sv2-btn-add touch-manipulation mt-2 disabled:opacity-45"
          >
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            新增量測紀錄
          </button>
        </V2SettingsVisualCard>

        <V2SettingsVisualCard icon={<Clock className="h-4 w-4" />} title="最近紀錄" staggerIndex={2}>
          {recent.length === 0 ? (
            <p className="text-[13px] py-2" style={{ color: '#7a807a' }}>還沒有量測紀錄</p>
          ) : (
            <>
              <div className="v2-sv2-table-header">
                <span>日期</span>
                <span>體重</span>
                <span>體脂</span>
                <span>體重變化</span>
                <span />
              </div>
              {recent.map((m, idx) => {
                const prev = recent[idx + 1]
                const delta =
                  prev?.weight_kg != null && m.weight_kg != null ? m.weight_kg - prev.weight_kg : null
                const isOldest = idx === recent.length - 1 && recent.length > 1
                return (
                  <button
                    key={m.id}
                    type="button"
                    className="v2-sv2-table-row touch-manipulation"
                    onClick={() => setEditingId(m.id)}
                  >
                    <span className="text-[12px]" style={{ color: '#123d24' }}>
                      {formatDisplayDate(m.measured_at?.slice(0, 10) ?? '')}
                    </span>
                    <span className="text-[12px] font-semibold" style={{ color: '#123d24' }}>
                      {m.weight_kg} kg
                    </span>
                    <span className="text-[12px]" style={{ color: '#7a807a' }}>
                      {m.body_fat_pct != null ? `${m.body_fat_pct}%` : '—'}
                    </span>
                    <span className="v2-sv2-delta-down">
                      {delta != null
                        ? `↓ ${delta <= 0 ? '' : '+'}${delta.toFixed(1)} kg`
                        : isOldest
                          ? '— 起始'
                          : '—'}
                    </span>
                    <ChevronRight className="h-4 w-4" style={{ color: '#7a807a' }} />
                  </button>
                )
              })}
            </>
          )}
        </V2SettingsVisualCard>
      </V2SettingsVisualShell>

      {editingId && (
        <EditMeasurementModal
          measurement={measurements.find(m => m.id === editingId)!}
          onClose={() => setEditingId(null)}
          onSaved={async () => {
            setEditingId(null)
            await refreshMeasurements()
            toast.success('設定已更新')
          }}
          onDelete={() => {
            void handleDelete(editingId)
            setEditingId(null)
          }}
        />
      )}
    </>
  )
}

function EditMeasurementModal({
  measurement,
  onClose,
  onSaved,
  onDelete,
}: {
  measurement: BodyMeasurement
  onClose: () => void
  onSaved: () => void
  onDelete: () => void
}) {
  const [weight, setWeight] = useState(String(measurement.weight_kg ?? ''))
  const [bf, setBf] = useState(String(measurement.body_fat_pct ?? ''))
  const [saving, setSaving] = useState(false)

  async function save() {
    const weightErr = validateWeightKg(parseOptionalNumber(weight))
    if (weightErr) {
      toast.error(weightErr)
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/measurements/${measurement.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight_kg: Number(weight),
          body_fat_pct: bf ? Number(bf) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新失敗')
    } finally {
      setSaving(false)
    }
  }

  return (
    <V2OverlayPortal open onClose={onClose}>
      <div className="v2-sv2-picker-sheet space-y-3" onClick={e => e.stopPropagation()}>
        <p className="text-[16px] font-bold" style={{ color: '#123d24' }}>編輯量測紀錄</p>
        <V2VisualField label="體重 (kg)">
          <V2VisualInput value={weight} onChange={setWeight} type="number" />
        </V2VisualField>
        <V2VisualField label="體脂 (%)">
          <V2VisualInput value={bf} onChange={setBf} type="number" />
        </V2VisualField>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onDelete} className="flex-1 py-3 rounded-full text-[14px]" style={{ color: '#e05252', border: '1px solid #e6eee2' }}>
            刪除
          </button>
          <button type="button" disabled={saving} onClick={() => void save()} className="flex-1 py-3 rounded-full text-white v2-sv2-btn-primary" style={{ minHeight: 48 }}>
            {saving ? '儲存中…' : '儲存'}
          </button>
        </div>
      </div>
    </V2OverlayPortal>
  )
}
