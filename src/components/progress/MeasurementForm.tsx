'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Plus, ChevronDown, ChevronUp } from 'lucide-react'

export default function MeasurementForm() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ weight_kg: '', body_fat_pct: '', muscle_mass_kg: '', waist_cm: '', hip_cm: '', chest_cm: '' })
  const router = useRouter()

  const set = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  async function handleSubmit() {
    if (!form.weight_kg && !form.body_fat_pct) {
      toast.error('至少填寫體重或體脂率')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
          body_fat_pct: form.body_fat_pct ? parseFloat(form.body_fat_pct) : null,
          muscle_mass_kg: form.muscle_mass_kg ? parseFloat(form.muscle_mass_kg) : null,
          waist_cm: form.waist_cm ? parseFloat(form.waist_cm) : null,
          hip_cm: form.hip_cm ? parseFloat(form.hip_cm) : null,
          chest_cm: form.chest_cm ? parseFloat(form.chest_cm) : null,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('記錄已儲存！')
      setForm({ weight_kg: '', body_fat_pct: '', muscle_mass_kg: '', waist_cm: '', hip_cm: '', chest_cm: '' })
      setOpen(false)
      router.refresh()
    } catch {
      toast.error('儲存失敗，請再試一次')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <button className="w-full px-4 py-3 flex items-center gap-2" onClick={() => setOpen(!open)}>
        <Plus className="h-5 w-5 text-emerald-500" />
        <span className="font-bold text-gray-800 flex-1 text-left">新增今日量測</span>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[
              ['weight_kg', '體重 (kg)', '70.5'],
              ['body_fat_pct', '體脂率 (%)', '25.0'],
              ['muscle_mass_kg', '肌肉量 (kg)', '45.0'],
              ['waist_cm', '腰圍 (cm)', '80'],
              ['hip_cm', '臀圍 (cm)', '95'],
              ['chest_cm', '胸圍 (cm)', '90'],
            ].map(([key, label, placeholder]) => (
              <div key={key}>
                <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
                <Input
                  type="number"
                  placeholder={placeholder}
                  step="0.1"
                  value={form[key as keyof typeof form]}
                  onChange={e => set(key as keyof typeof form, e.target.value)}
                  className="text-sm"
                />
              </div>
            ))}
          </div>
          <Button onClick={handleSubmit} disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-600">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            儲存記錄
          </Button>
        </div>
      )}
    </div>
  )
}
