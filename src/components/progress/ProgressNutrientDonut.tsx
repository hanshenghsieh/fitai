'use client'

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { BB_V2 } from '@/lib/betterbit-v2'
import BBCard from '@/components/ui/BBCard'

interface Props {
  proteinG: number
  carbsG: number
  fatG: number
}

export default function ProgressNutrientDonut({ proteinG, carbsG, fatG }: Props) {
  const data = [
    { name: '蛋白質', value: Math.max(proteinG, 1), color: BB_V2.macro.protein },
    { name: '碳水', value: Math.max(carbsG, 1), color: BB_V2.macro.carbs },
    { name: '脂肪', value: Math.max(fatG, 1), color: BB_V2.macro.fat },
  ]
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <BBCard className="mx-5">
      <p className="text-[15px] mb-4" style={{ color: BB_V2.text.primary, fontWeight: 700 }}>
        營養比例
      </p>
      <div className="flex items-center gap-4">
        <div className="w-[140px] h-[140px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={42} outerRadius={64} strokeWidth={0}>
                {data.map(entry => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 space-y-3">
          {data.map(row => (
            <div key={row.name} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                <span className="text-[13px]" style={{ color: BB_V2.text.primary, fontWeight: 500 }}>{row.name}</span>
              </div>
              <span className="text-[13px] tabular-nums" style={{ color: BB_V2.text.secondary, fontWeight: 600 }}>
                {Math.round((row.value / total) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </BBCard>
  )
}
