'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { format } from 'date-fns'
import type { BodyMeasurement, Goal } from '@/types'

interface WeekStats {
  week_start: string
  week_number: number
  previous_completion_rate: number | null
  previous_workout_rate: number | null
}

interface Props {
  measurements: BodyMeasurement[]
  plans: WeekStats[]
  goal: Goal | null
}

export default function ProgressCharts({ measurements, plans, goal }: Props) {
  const weightData = measurements
    .filter(m => m.weight_kg !== null)
    .map(m => ({ date: format(new Date(m.measured_at), 'M/d'), weight: m.weight_kg, bodyFat: m.body_fat_pct }))

  const completionData = plans
    .filter(p => p.previous_completion_rate !== null || p.previous_workout_rate !== null)
    .map(p => ({
      week: `W${p.week_number}`,
      diet: p.previous_completion_rate ? Math.round(p.previous_completion_rate) : null,
      workout: p.previous_workout_rate ? Math.round(p.previous_workout_rate) : null,
    }))

  if (measurements.length === 0 && plans.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 text-center">
        <p className="text-2xl mb-2">📊</p>
        <p className="text-gray-600 font-medium">尚無進度資料</p>
        <p className="text-sm text-gray-400 mt-1">新增體重記錄後，這裡將顯示你的進度圖表</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Goal progress */}
      {goal && measurements.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-bold text-gray-800 mb-3">目標進度</h3>
          <GoalProgressBar goal={goal} measurements={measurements} />
        </div>
      )}

      {/* Weight chart */}
      {weightData.length >= 2 && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-bold text-gray-800 mb-3">體重趨勢 (kg)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={weightData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} domain={['dataMin - 2', 'dataMax + 2']} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                formatter={(val) => [`${val} kg`, '體重']}
              />
              {goal?.target_weight_kg && (
                <ReferenceLine y={goal.target_weight_kg} stroke="#10b981" strokeDasharray="4 4" label={{ value: '目標', fill: '#10b981', fontSize: 11 }} />
              )}
              <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Body fat chart */}
      {weightData.filter(d => d.bodyFat).length >= 2 && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-bold text-gray-800 mb-3">體脂率趨勢 (%)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={weightData.filter(d => d.bodyFat)} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} domain={['dataMin - 1', 'dataMax + 1']} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                formatter={(val) => [`${val}%`, '體脂率']}
              />
              {goal?.target_body_fat_pct && (
                <ReferenceLine y={goal.target_body_fat_pct} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: '目標', fill: '#f59e0b', fontSize: 11 }} />
              )}
              <Line type="monotone" dataKey="bodyFat" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Completion rate chart */}
      {completionData.length >= 2 && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-bold text-gray-800 mb-3">執行率趨勢 (%)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={completionData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} domain={[0, 100]} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                formatter={(val, name) => [`${val}%`, name === 'diet' ? '飲食' : '運動']}
              />
              <ReferenceLine y={80} stroke="#10b981" strokeDasharray="2 2" />
              <Line type="monotone" dataKey="diet" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} name="diet" />
              <Line type="monotone" dataKey="workout" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} name="workout" />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 text-xs text-gray-500 justify-center">
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-emerald-500" />飲食</span>
            <span className="flex items-center gap-1"><span className="inline-block w-3 h-0.5 bg-purple-500" />運動</span>
          </div>
        </div>
      )}

      {/* Measurements history */}
      {measurements.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">量測記錄</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {[...measurements].reverse().slice(0, 8).map(m => (
              <div key={m.id} className="px-4 py-3 flex items-center">
                <span className="text-sm text-gray-500 w-20 flex-shrink-0">{format(new Date(m.measured_at), 'M/d')}</span>
                <div className="flex gap-4 text-sm flex-wrap">
                  {m.weight_kg && <span><span className="font-medium text-gray-800">{m.weight_kg}</span><span className="text-gray-400 text-xs">kg</span></span>}
                  {m.body_fat_pct && <span><span className="font-medium text-orange-500">{m.body_fat_pct}</span><span className="text-gray-400 text-xs">% 體脂</span></span>}
                  {m.muscle_mass_kg && <span><span className="font-medium text-purple-600">{m.muscle_mass_kg}</span><span className="text-gray-400 text-xs">kg 肌肉</span></span>}
                  {m.waist_cm && <span><span className="font-medium text-blue-500">{m.waist_cm}</span><span className="text-gray-400 text-xs">cm 腰</span></span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function GoalProgressBar({ goal, measurements }: { goal: Goal; measurements: BodyMeasurement[] }) {
  const latest = measurements[measurements.length - 1]
  if (!latest) return null

  if (goal.goal_type === 'lose_weight' || goal.goal_type === 'lose_fat') {
    const start = goal.start_weight_kg ?? latest.weight_kg ?? 0
    const target = goal.target_weight_kg
    const current = latest.weight_kg ?? start

    if (!target || !current) return null

    const totalToLose = start - target
    const lostSoFar = start - current
    const pct = Math.min(100, Math.max(0, (lostSoFar / totalToLose) * 100))

    return (
      <div>
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>起始：{start} kg</span>
          <span className="font-medium text-emerald-600">現在：{current} kg</span>
          <span>目標：{target} kg</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-gray-400 mt-1 text-right">{pct.toFixed(0)}% 達成</p>
      </div>
    )
  }
  return null
}
