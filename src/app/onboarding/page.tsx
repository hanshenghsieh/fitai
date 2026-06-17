'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Loader2, ChevronRight, ChevronLeft, Upload, X, AlertTriangle } from 'lucide-react'
import { addMonths, format, startOfWeek } from 'date-fns'

const TOTAL_STEPS = 6

interface FormData {
  // Step 1: Body basics
  gender: string
  age: string
  height_cm: string
  weight_kg: string
  body_fat_pct: string
  muscle_mass_kg: string
  // Step 2: Goal
  goal_type: string
  target_weight_kg: string
  target_body_fat_pct: string
  goal_months: string
  // Step 3: Diet
  is_vegetarian: boolean
  is_vegan: boolean
  is_halal: boolean
  is_gluten_free: boolean
  allergens: string[]
  disliked_foods: string
  cuisine_preference: string
  cooking_time_mins: string
  food_budget: string
  // Step 4: Fitness
  fitness_level: string
  activity_level: string
  equipment: string[]
  // Step 5: Restrictions
  injuries: string[]
  health_conditions: string[]
  // Step 6: InBody upload (optional)
  inbodyFile: File | null
}

const initialData: FormData = {
  gender: '', age: '', height_cm: '', weight_kg: '', body_fat_pct: '', muscle_mass_kg: '',
  goal_type: '', target_weight_kg: '', target_body_fat_pct: '', goal_months: '3',
  is_vegetarian: false, is_vegan: false, is_halal: false, is_gluten_free: false,
  allergens: [], disliked_foods: '', cuisine_preference: 'asian', cooking_time_mins: '30', food_budget: 'medium',
  fitness_level: 'beginner', activity_level: 'moderate', equipment: [],
  injuries: [], health_conditions: [],
  inbodyFile: null,
}

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<FormData>(initialData)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const set = (key: keyof FormData, val: unknown) => setData(prev => ({ ...prev, [key]: val }))

  // BMI warning check
  const bmi = data.height_cm && data.weight_kg
    ? (parseFloat(data.weight_kg) / Math.pow(parseFloat(data.height_cm) / 100, 2))
    : null
  const showBMIWarning = bmi !== null && (bmi < 17.5 || bmi > 40)

  async function handleSubmit() {
    setLoading(true)
    const supabase = createClient()
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('未登入')

      const weightKg = parseFloat(data.weight_kg) || 70
      const gender = data.gender
      const endDate = format(addMonths(new Date(), parseInt(data.goal_months) || 3), 'yyyy-MM-dd')

      // Update profile
      console.log('Updating profile...')
      const { error: profileError } = await supabase.from('user_profiles').upsert({
        id: user.id,
        gender: data.gender || null,
        age: parseInt(data.age) || null,
        height_cm: parseFloat(data.height_cm) || null,
        weight_kg: weightKg,
        body_fat_pct: parseFloat(data.body_fat_pct) || null,
        muscle_mass_kg: parseFloat(data.muscle_mass_kg) || null,
        activity_level: data.activity_level,
        is_vegetarian: data.is_vegetarian,
        is_vegan: data.is_vegan,
        is_halal: data.is_halal,
        is_gluten_free: data.is_gluten_free,
        allergens: data.allergens,
        disliked_foods: data.disliked_foods.split(/[,，]/).map(s => s.trim()).filter(Boolean),
        cuisine_preference: data.cuisine_preference,
        cooking_time_mins: parseInt(data.cooking_time_mins) || 30,
        food_budget: data.food_budget,
        equipment: data.equipment,
        injuries: data.injuries,
        health_conditions: data.health_conditions,
        fitness_level: data.fitness_level,
        water_ml_target: gender === 'female' ? 2000 : 2500,
        onboarding_completed: true,
      })
      if (profileError) throw new Error(`Profile error: ${profileError.message}`)

      // Create goal
      console.log('Creating goal...')
      const { error: goalError } = await supabase.from('goals').insert({
        user_id: user.id,
        goal_type: data.goal_type || 'lose_fat',
        target_weight_kg: parseFloat(data.target_weight_kg) || null,
        target_body_fat_pct: parseFloat(data.target_body_fat_pct) || null,
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: endDate,
        start_weight_kg: weightKg,
        start_body_fat_pct: parseFloat(data.body_fat_pct) || null,
      })
      if (goalError) throw new Error(`Goal error: ${goalError.message}`)

      // Upload InBody if provided
      if (data.inbodyFile) {
        console.log('Uploading InBody...')
        const fileExt = data.inbodyFile.name.split('.').pop()
        const path = `${user.id}/inbody-${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('inbody-uploads')
          .upload(path, data.inbodyFile, { upsert: true })

        if (!uploadError) {
          const { error: dbError } = await supabase.from('inbody_uploads').insert({
            user_id: user.id,
            storage_path: path,
            parsing_status: 'pending',
          })
          if (!dbError) {
            fetch('/api/parse-inbody', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ storagePath: path }),
            }).catch(() => {})
          }
        }
      }

      // Generate personalized plan using Claude
      console.log('🤖 Generating personalized plan...')
      toast.loading('正在為你生成個性化計畫...')

      try {
        const generateRes = await fetch('/api/generate-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profile: {
              gender: data.gender,
              age: data.age,
              weight_kg: data.weight_kg,
              injuries: data.injuries,
              health_conditions: data.health_conditions,
            },
            goal: data.goal_type || 'gain_muscle',
            preferences: {
              diet_restrictions: {
                vegetarian: data.is_vegetarian,
                vegan: data.is_vegan,
                allergies: data.allergens,
              },
              equipment: data.equipment,
              fitness_level: data.fitness_level,
            },
          }),
        })

        if (!generateRes.ok) {
          const err = await generateRes.text()
          throw new Error(`Plan generation failed: ${err}`)
        }

        const planData = await generateRes.json()
        console.log('✅ Plan generated:', planData.days?.length, 'days')

        const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

        await supabase.from('weekly_plans').upsert({
          user_id: user.id,
          week_start: weekStart,
          week_number: 1,
          plan_data: planData,
          generation_status: 'completed',
          coach_note: planData.coach_note || '根據你的需求生成的個性化計畫',
        }, { onConflict: 'user_id,week_start' })

        console.log('✅ Personalized plan saved')
        toast.success('計畫已準備就緒！')
      } catch (err) {
        console.error('Plan generation error:', err)
        toast.error(`計畫生成失敗: ${err instanceof Error ? err.message : '未知錯誤'}`)
      }

      // Redirect to dashboard immediately
      console.log('🚀 Redirecting to /dashboard')
      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : JSON.stringify(err)
      console.error('Onboarding error:', errorMsg)
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const canNext = () => {
    if (step === 1) return data.gender && data.age && data.height_cm && data.weight_kg
    if (step === 2) return data.goal_type
    return true
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 p-4 flex items-start justify-center pt-8">
      <div className="w-full max-w-xl">
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>建立你的健身檔案</span>
            <span>{step} / {TOTAL_STEPS}</span>
          </div>
          <Progress value={(step / TOTAL_STEPS) * 100} className="h-2" />
        </div>

        {step === 1 && <StepBodyBasics data={data} set={set} bmi={bmi} showBMIWarning={showBMIWarning} />}
        {step === 2 && <StepGoal data={data} set={set} />}
        {step === 3 && <StepDiet data={data} set={set} />}
        {step === 4 && <StepFitness data={data} set={set} />}
        {step === 5 && <StepRestrictions data={data} set={set} />}
        {step === 6 && <StepInBody data={data} set={set} />}

        <div className="flex gap-3 mt-4">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)} className="flex-1">
              <ChevronLeft className="h-4 w-4 mr-1" /> 上一步
            </Button>
          )}
          {step < TOTAL_STEPS ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600"
            >
              下一步 <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading} className="flex-1 bg-emerald-500 hover:bg-emerald-600">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              生成我的計畫！
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Step Components ───────────────────────────────────────────────────────────

function StepBodyBasics({ data, set, bmi, showBMIWarning }: {
  data: FormData
  set: (k: keyof FormData, v: unknown) => void
  bmi: number | null
  showBMIWarning: boolean
}) {
  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <CardTitle>基本身體資料</CardTitle>
        <CardDescription>用於計算你的基礎代謝率與每日熱量需求</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>性別</Label>
          <div className="flex gap-3 mt-2">
            {[['male','男性'],['female','女性'],['other','其他']].map(([val, label]) => (
              <button key={val}
                type="button"
                onClick={() => set('gender', val)}
                className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${data.gender === val ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
              >{label}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="age">年齡</Label>
            <Input id="age" type="number" placeholder="25" value={data.age} onChange={e => set('age', e.target.value)} min={10} max={100} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="height">身高 (cm)</Label>
            <Input id="height" type="number" placeholder="170" value={data.height_cm} onChange={e => set('height_cm', e.target.value)} min={100} max={250} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="weight">體重 (kg)</Label>
            <Input id="weight" type="number" placeholder="70" value={data.weight_kg} onChange={e => set('weight_kg', e.target.value)} step="0.1" min={20} max={300} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="bf">體脂率 (%)</Label>
            <Input id="bf" type="number" placeholder="25" value={data.body_fat_pct} onChange={e => set('body_fat_pct', e.target.value)} step="0.1" min={1} max={70} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="muscle">肌肉量 (kg) <span className="text-gray-400 font-normal">選填</span></Label>
            <Input id="muscle" type="number" placeholder="45" value={data.muscle_mass_kg} onChange={e => set('muscle_mass_kg', e.target.value)} step="0.1" min={0} max={150} className="mt-1" />
          </div>
          {bmi && (
            <div className="flex items-center">
              <div>
                <Label>BMI</Label>
                <p className={`text-lg font-bold mt-1 ${showBMIWarning ? 'text-orange-500' : 'text-emerald-600'}`}>{bmi.toFixed(1)}</p>
              </div>
            </div>
          )}
        </div>
        {showBMIWarning && (
          <div className="flex gap-2 bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-700">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>你的 BMI 值在極端範圍，建議先諮詢醫師再開始計畫。</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StepGoal({ data, set }: { data: FormData; set: (k: keyof FormData, v: unknown) => void }) {
  const goals = [
    { val: 'lose_fat', label: '減脂', desc: '降低體脂率，保留肌肉' },
    { val: 'lose_weight', label: '減重', desc: '降低體重為主要目標' },
    { val: 'gain_muscle', label: '增肌', desc: '增加肌肉量與力量' },
    { val: 'maintain', label: '維持體態', desc: '保持現有體組成' },
    { val: 'body_recomp', label: '體態重組', desc: '同步減脂+增肌（進階）' },
  ]

  const validateGoal = (type: string, targetWeight: string, targetBf: string, weight: string, bf: string) => {
    if (type === 'lose_weight' && targetWeight && weight) {
      const diff = parseFloat(weight) - parseFloat(targetWeight)
      const months = parseInt(data.goal_months)
      if (diff / months > 4) return '建議每月不超過4kg的減重速度，以保持健康與肌肉量'
    }
    if (type === 'lose_fat' && targetBf && bf) {
      const diff = parseFloat(bf) - parseFloat(targetBf)
      const months = parseInt(data.goal_months)
      if (diff / months > 2) return '建議每月體脂降低不超過2%，避免肌肉流失'
    }
    return null
  }

  const warning = validateGoal(data.goal_type, data.target_weight_kg, data.target_body_fat_pct, data.weight_kg, data.body_fat_pct)

  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <CardTitle>設定目標</CardTitle>
        <CardDescription>AI 將根據目標調整熱量與訓練策略</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>目標類型</Label>
          <div className="grid grid-cols-1 gap-2 mt-2">
            {goals.map(g => (
              <button key={g.val} type="button" onClick={() => set('goal_type', g.val)}
                className={`p-3 rounded-lg border-2 text-left transition-colors ${data.goal_type === g.val ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <span className={`font-medium ${data.goal_type === g.val ? 'text-emerald-700' : 'text-gray-700'}`}>{g.label}</span>
                <span className="text-sm text-gray-400 ml-2">{g.desc}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>計畫時長</Label>
          <div className="flex gap-2 mt-2">
            {[['1','1個月'],['2','2個月'],['3','3個月'],['6','6個月']].map(([val, label]) => (
              <button key={val} type="button" onClick={() => set('goal_months', val)}
                className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${data.goal_months === val ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {(data.goal_type === 'lose_weight' || data.goal_type === 'body_recomp') && (
          <div>
            <Label htmlFor="tw">目標體重 (kg)</Label>
            <Input id="tw" type="number" placeholder="65" value={data.target_weight_kg} onChange={e => set('target_weight_kg', e.target.value)} step="0.1" className="mt-1" />
          </div>
        )}
        {(data.goal_type === 'lose_fat' || data.goal_type === 'body_recomp') && (
          <div>
            <Label htmlFor="tbf">目標體脂率 (%)</Label>
            <Input id="tbf" type="number" placeholder="18" value={data.target_body_fat_pct} onChange={e => set('target_body_fat_pct', e.target.value)} step="0.1" className="mt-1" />
          </div>
        )}
        {warning && (
          <div className="flex gap-2 bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-700">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{warning}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StepDiet({ data, set }: { data: FormData; set: (k: keyof FormData, v: unknown) => void }) {
  const allergenOptions = ['堅果','乳製品','海鮮','蛋','麩質','大豆','貝類']
  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <CardTitle>飲食偏好與限制</CardTitle>
        <CardDescription>確保菜單安全且符合你的生活習慣</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>飲食習慣</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {[
              { key: 'is_vegan', label: '純素食' },
              { key: 'is_vegetarian', label: '素食（蛋奶可）' },
              { key: 'is_halal', label: '清真' },
              { key: 'is_gluten_free', label: '無麩質' },
            ].map(({ key, label }) => (
              <button key={key} type="button"
                onClick={() => {
                  if (key === 'is_vegan' && !data.is_vegan) set('is_vegetarian', true)
                  set(key as keyof FormData, !data[key as keyof FormData])
                }}
                className={`px-3 py-1.5 rounded-full border-2 text-sm font-medium transition-colors ${data[key as keyof FormData] ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>過敏原（可多選）</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {allergenOptions.map(a => (
              <button key={a} type="button"
                onClick={() => set('allergens', toggle(data.allergens, a))}
                className={`px-3 py-1.5 rounded-full border-2 text-sm font-medium transition-colors ${data.allergens.includes(a) ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600'}`}>
                {a}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label htmlFor="dislikes">不喜歡的食物（逗號分隔）</Label>
          <Input id="dislikes" placeholder="例：香菜,苦瓜,洋蔥" value={data.disliked_foods} onChange={e => set('disliked_foods', e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>飲食風格偏好</Label>
          <div className="flex gap-2 mt-2">
            {[['asian','亞洲菜系'],['western','西式'],['mixed','中西混合']].map(([val,label]) => (
              <button key={val} type="button" onClick={() => set('cuisine_preference', val)}
                className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${data.cuisine_preference === val ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>每餐備餐時間</Label>
            <div className="flex gap-2 mt-2">
              {[['15','15分'],['30','30分'],['60','60分+']].map(([val,label]) => (
                <button key={val} type="button" onClick={() => set('cooking_time_mins', val)}
                  className={`flex-1 py-1.5 rounded-lg border-2 text-xs font-medium transition-colors ${data.cooking_time_mins === val ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>飲食預算</Label>
            <div className="flex gap-2 mt-2">
              {[['low','省'],['medium','中'],['high','高']].map(([val,label]) => (
                <button key={val} type="button" onClick={() => set('food_budget', val)}
                  className={`flex-1 py-1.5 rounded-lg border-2 text-xs font-medium transition-colors ${data.food_budget === val ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StepFitness({ data, set }: { data: FormData; set: (k: keyof FormData, v: unknown) => void }) {
  const equipmentOptions = [
    { val: 'dumbbells', label: '啞鈴' },
    { val: 'barbell', label: '槓鈴' },
    { val: 'pull_up_bar', label: '引體向上架' },
    { val: 'resistance_bands', label: '彈力帶' },
    { val: 'jump_rope', label: '跳繩' },
    { val: 'none', label: '無器材' },
  ]
  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <CardTitle>健身設定</CardTitle>
        <CardDescription>幫助 AI 設計適合你的訓練課表</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>健身程度</Label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {[['beginner','初學者','剛開始或不規律運動'],['intermediate','中階','規律運動 6 個月以上'],['advanced','進階','系統訓練 2 年以上']].map(([val,label,desc]) => (
              <button key={val} type="button" onClick={() => set('fitness_level', val)}
                className={`p-3 rounded-lg border-2 text-center transition-colors ${data.fitness_level === val ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'}`}>
                <div className={`font-medium text-sm ${data.fitness_level === val ? 'text-emerald-700' : 'text-gray-700'}`}>{label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>日常活動量</Label>
          <div className="grid grid-cols-1 gap-2 mt-2">
            {[
              ['sedentary','久坐少動','辦公室工作，幾乎不運動'],
              ['light','輕度活動','每週運動 1-2 次'],
              ['moderate','中度活動','每週運動 3-4 次'],
              ['active','積極活動','每週運動 5-6 次'],
              ['very_active','非常活躍','每天高強度運動或體力勞動'],
            ].map(([val,label,desc]) => (
              <button key={val} type="button" onClick={() => set('activity_level', val)}
                className={`p-3 rounded-lg border-2 text-left transition-colors ${data.activity_level === val ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <span className={`font-medium text-sm ${data.activity_level === val ? 'text-emerald-700' : 'text-gray-700'}`}>{label}</span>
                <span className="text-xs text-gray-400 ml-2">{desc}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>可用器材（可多選）</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {equipmentOptions.map(({ val, label }) => (
              <button key={val} type="button"
                onClick={() => {
                  if (val === 'none') {
                    set('equipment', data.equipment.includes('none') ? [] : ['none'])
                  } else {
                    set('equipment', toggle(data.equipment.filter(e => e !== 'none'), val))
                  }
                }}
                className={`px-3 py-1.5 rounded-full border-2 text-sm font-medium transition-colors ${data.equipment.includes(val) ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StepRestrictions({ data, set }: { data: FormData; set: (k: keyof FormData, v: unknown) => void }) {
  const injuryOptions = [
    { val: 'knee', label: '膝蓋' }, { val: 'back', label: '下背' },
    { val: 'shoulder', label: '肩膀' }, { val: 'wrist', label: '手腕' },
    { val: 'hip', label: '髖關節' }, { val: 'neck', label: '頸椎' },
  ]
  const conditionOptions = [
    { val: 'diabetes', label: '糖尿病' }, { val: 'hypertension', label: '高血壓' },
    { val: 'pregnancy', label: '懷孕中' }, { val: 'heart_disease', label: '心臟病' },
    { val: 'osteoporosis', label: '骨質疏鬆' },
  ]
  const hasConditions = data.health_conditions.length > 0

  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <CardTitle>傷病與健康狀況</CardTitle>
        <CardDescription>確保計畫安全，迴避禁忌動作</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>傷病部位（可多選）</Label>
          <p className="text-xs text-gray-400 mt-0.5">相關動作將自動排除或提供替代方案</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {injuryOptions.map(({ val, label }) => (
              <button key={val} type="button"
                onClick={() => set('injuries', toggle(data.injuries, val))}
                className={`px-3 py-1.5 rounded-full border-2 text-sm font-medium transition-colors ${data.injuries.includes(val) ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label>健康狀況（可多選）</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {conditionOptions.map(({ val, label }) => (
              <button key={val} type="button"
                onClick={() => set('health_conditions', toggle(data.health_conditions, val))}
                className={`px-3 py-1.5 rounded-full border-2 text-sm font-medium transition-colors ${data.health_conditions.includes(val) ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200 text-gray-600'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {hasConditions && (
          <div className="flex gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>你填寫了健康狀況，本系統計畫僅供參考。請務必在醫師或專業人士的指導下進行。</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StepInBody({ data, set }: { data: FormData; set: (k: keyof FormData, v: unknown) => void }) {
  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <CardTitle>上傳 InBody 報告 <Badge variant="secondary">選填</Badge></CardTitle>
        <CardDescription>AI 將自動讀取數值，讓計畫更精準</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.inbodyFile ? (
          <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-700">{data.inbodyFile.name}</p>
              <p className="text-xs text-gray-400">{(data.inbodyFile.size / 1024).toFixed(0)} KB</p>
            </div>
            <button type="button" onClick={() => set('inbodyFile', null)} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <label className="block cursor-pointer">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-emerald-400 hover:bg-emerald-50 transition-colors">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-600">點擊上傳 InBody 照片</p>
              <p className="text-xs text-gray-400 mt-1">支援 JPG、PNG，建議拍攝清晰</p>
            </div>
            <input type="file" accept="image/*" className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file && file.size > 10 * 1024 * 1024) {
                  toast.error('檔案大小不得超過 10MB')
                  return
                }
                set('inbodyFile', file ?? null)
              }} />
          </label>
        )}
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-gray-500">
            沒有 InBody 報告也沒關係，我們已根據你填寫的資料建立個人化計畫。
            InBody 上傳後將在背景自動解析，下次登入可看到更精準的數值。
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
