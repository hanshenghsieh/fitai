'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, LogOut, RefreshCw, AlertTriangle, CreditCard, Check } from 'lucide-react'
import type { UserProfile, Goal } from '@/types'
import SubscriptionManager from './SubscriptionManager'

export default function SettingsClient({ profile, goal }: { profile: UserProfile | null; goal: Goal | null }) {
  const [weight, setWeight] = useState(profile?.weight_kg?.toString() ?? '')
  const [bodyFat, setBodyFat] = useState(profile?.body_fat_pct?.toString() ?? '')
  const [water, setWater] = useState(profile?.water_ml_target?.toString() ?? '2000')
  const [loading, setLoading] = useState(false)
  const [regenLoading, setRegenLoading] = useState(false)
  const router = useRouter()

  async function handleSave() {
    setLoading(true)
    const supabase = createClient()
    try {
      const { error } = await supabase.from('user_profiles').update({
        weight_kg: parseFloat(weight) || null,
        body_fat_pct: parseFloat(bodyFat) || null,
        water_ml_target: parseInt(water) || 2000,
      }).eq('id', profile?.id ?? '')
      if (error) throw error
      toast.success('設定已更新')
      router.refresh()
    } catch {
      toast.error('更新失敗')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegenPlan() {
    setRegenLoading(true)
    try {
      const res = await fetch('/api/generate-plan', { method: 'POST' })
      if (!res.ok) throw new Error()
      toast.success('計畫重新生成中，請稍候...')
      router.push('/dashboard')
    } catch {
      toast.error('生成失敗，請稍後再試')
    } finally {
      setRegenLoading(false)
    }
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="px-4 pb-4 mt-4 space-y-4">
      {/* Quick update */}
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <h3 className="font-bold text-gray-800">快速更新數值</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">目前體重 (kg)</Label>
            <Input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">目前體脂率 (%)</Label>
            <Input type="number" step="0.1" value={bodyFat} onChange={e => setBodyFat(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">每日喝水目標 (ml)</Label>
            <Input type="number" step="100" value={water} onChange={e => setWater(e.target.value)} className="mt-1" />
          </div>
        </div>
        <Button onClick={handleSave} disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-600">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} 儲存
        </Button>
      </div>

      {/* Current goal */}
      {goal && (
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-bold text-gray-800 mb-2">目前目標</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p>類型：{goal.goal_type}</p>
            {goal.target_weight_kg && <p>目標體重：{goal.target_weight_kg} kg</p>}
            {goal.target_body_fat_pct && <p>目標體脂：{goal.target_body_fat_pct}%</p>}
            <p>截止日期：{goal.end_date}</p>
          </div>
        </div>
      )}

      {/* Subscription */}
      <SubscriptionManager />

      {/* Regenerate plan */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <h3 className="font-bold text-gray-800 mb-1">重新生成本週計畫</h3>
        <p className="text-xs text-gray-400 mb-3">當你更新了體重或其他資料，可以重新讓 AI 生成更適合的計畫</p>
        <Button variant="outline" onClick={handleRegenPlan} disabled={regenLoading} className="w-full">
          {regenLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          重新生成計畫
        </Button>
      </div>

      {/* Disclaimer */}
      <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex gap-2">
        <AlertTriangle className="h-4 w-4 text-orange-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-orange-700">
          本服務提供之飲食與運動計畫僅供健康參考，不構成醫療建議。如有健康疑慮，請諮詢醫師或專業人士。
        </p>
      </div>

      {/* Logout */}
      <Button variant="ghost" onClick={handleLogout} className="w-full text-red-500 hover:text-red-600 hover:bg-red-50">
        <LogOut className="h-4 w-4 mr-2" /> 登出
      </Button>
    </div>
  )
}
