import type { UserProfile, Goal } from '@/types'
import { convenienceStoreMenu } from './convenience-store-menu'
import {
  calculateTDEE,
  calculateNutritionTargets,
  type NutritionTargets,
} from './goal-calculator'
import { buildMealCombinationLegacy as buildMealCombination } from './meal-combo-engine'
import { buildScaledHomeMeal } from './home-meal-builder'

export { calculateTDEE, calculateNutritionTargets, type NutritionTargets }
export { buildMealCombination }
export { buildScaledHomeMeal }

// 便利店菜單篩選（舊函數，保留向後相容）
export function selectConvenienceItemForMeal(
  mealType: 'breakfast' | 'lunch' | 'dinner',
  targetCalories: number,
  targetProtein: number,
  excludeStore?: string
) {
  let items = convenienceStoreMenu.filter(
    item =>
      item.category === mealType &&
      (!excludeStore || item.store !== excludeStore)
  )

  // 找最接近目標熱量且蛋白質最高的
  let best = items[0]
  let bestScore = Infinity

  for (const item of items) {
    const caloriesDiff = Math.abs(item.calories - targetCalories)
    const proteinScore = Math.max(0, targetProtein - item.protein_g) * 2 // 蛋白質不足懲罰加倍

    const score = caloriesDiff + proteinScore
    if (score < bestScore) {
      bestScore = score
      best = item
    }
  }

  return best
}

// 運動計畫生成
export interface ExerciseSet {
  exercise_id: string
  exercise_name: string
  exercise_name_zh: string
  youtube_id: string | null
  sets: number
  reps: number | null
  duration_secs: number | null
  rest_secs: number
  notes: string
}

// 重訓動作庫 — equipment 為所需器材（'none'=徒手），可多選
type EquipTag = 'dumbbells' | 'barbell' | 'pull_up_bar' | 'resistance_bands' | 'jump_rope' | 'gym' | 'none'

interface ExerciseTemplate {
  id: string
  name: string
  name_zh: string
  youtube_id: string | null
  reps: number
  sets: number
  rest: number
  equipment: EquipTag[]
  split: 'upper' | 'lower'
  avoidIf?: ('knee' | 'back' | 'shoulder' | 'wrist')[]
}

const EXERCISE_POOL: ExerciseTemplate[] = [
  // 上肢 — 健身房/槓鈴
  { id: 'bench-press', name: 'Bench Press', name_zh: '槓鈴臥推', youtube_id: '4YnVV_Ksb1E', reps: 8, sets: 4, rest: 90, equipment: ['barbell', 'gym'], split: 'upper', avoidIf: ['shoulder', 'wrist'] },
  { id: 'barbell-row', name: 'Barbell Row', name_zh: '槓鈴划船', youtube_id: 'w-PL77Umd28', reps: 8, sets: 4, rest: 90, equipment: ['barbell', 'gym'], split: 'upper', avoidIf: ['back'] },
  { id: 'ohp', name: 'Overhead Press', name_zh: '槓鈴肩推', youtube_id: 'GbnXvEaso8s', reps: 8, sets: 3, rest: 90, equipment: ['barbell', 'gym'], split: 'upper', avoidIf: ['shoulder'] },
  // 上肢 — 啞鈴
  { id: 'db-press', name: 'Dumbbell Press', name_zh: '啞鈴卧推', youtube_id: '4YnVV_Ksb1E', reps: 10, sets: 3, rest: 75, equipment: ['dumbbells'], split: 'upper', avoidIf: ['shoulder'] },
  { id: 'db-rows', name: 'Dumbbell Rows', name_zh: '啞鈴划船', youtube_id: 'w-PL77Umd28', reps: 10, sets: 3, rest: 75, equipment: ['dumbbells'], split: 'upper' },
  { id: 'db-shoulder', name: 'Dumbbell Shoulder Press', name_zh: '啞鈴肩推', youtube_id: 'GbnXvEaso8s', reps: 10, sets: 3, rest: 75, equipment: ['dumbbells'], split: 'upper', avoidIf: ['shoulder'] },
  { id: 'db-flyes', name: 'Dumbbell Flyes', name_zh: '啞鈴飛鳥', youtube_id: 'eozdVT5pDcQ', reps: 12, sets: 3, rest: 60, equipment: ['dumbbells'], split: 'upper' },
  { id: 'db-curl', name: 'Dumbbell Curl', name_zh: '啞鈴二頭彎舉', youtube_id: 'ykJmrZ5v0Oo', reps: 12, sets: 3, rest: 60, equipment: ['dumbbells'], split: 'upper', avoidIf: ['wrist'] },
  { id: 'lateral-raise', name: 'Lateral Raise', name_zh: '側平舉', youtube_id: '3VcKaXpzqRo', reps: 12, sets: 3, rest: 60, equipment: ['dumbbells'], split: 'upper', avoidIf: ['shoulder'] },
  // 上肢 — 引體向上架
  { id: 'pull-ups', name: 'Pull-ups', name_zh: '引體向上', youtube_id: 'eGo4IYlbE5g', reps: 6, sets: 3, rest: 90, equipment: ['pull_up_bar'], split: 'upper' },
  { id: 'chin-ups', name: 'Chin-ups', name_zh: '反手引體', youtube_id: 'eGo4IYlbE5g', reps: 6, sets: 3, rest: 90, equipment: ['pull_up_bar'], split: 'upper', avoidIf: ['wrist'] },
  // 上肢 — 健身房器械
  { id: 'lat-pulldown', name: 'Lat Pulldown', name_zh: '滑輪下拉', youtube_id: 'CAwf7n6Luuc', reps: 10, sets: 3, rest: 75, equipment: ['gym'], split: 'upper' },
  { id: 'cable-row', name: 'Cable Row', name_zh: '滑輪划船', youtube_id: 'GZbfZ033f74', reps: 10, sets: 3, rest: 75, equipment: ['gym'], split: 'upper' },
  { id: 'face-pull', name: 'Face Pull', name_zh: '臉拉', youtube_id: 'rep-qVOAyvg', reps: 15, sets: 3, rest: 60, equipment: ['gym', 'resistance_bands'], split: 'upper' },
  // 上肢 — 彈力帶
  { id: 'band-row', name: 'Band Rows', name_zh: '彈力帶划船', youtube_id: 'w-PL77Umd28', reps: 15, sets: 3, rest: 60, equipment: ['resistance_bands'], split: 'upper' },
  { id: 'band-press', name: 'Band Chest Press', name_zh: '彈力帶胸推', youtube_id: '4YnVV_Ksb1E', reps: 15, sets: 3, rest: 60, equipment: ['resistance_bands'], split: 'upper' },
  // 上肢 — 徒手
  { id: 'push-ups', name: 'Push-ups', name_zh: '伏地挺身', youtube_id: 'IODxDxX7oi4', reps: 12, sets: 3, rest: 60, equipment: ['none'], split: 'upper', avoidIf: ['wrist', 'shoulder'] },
  { id: 'wall-push', name: 'Wall Push-ups', name_zh: '靠牆伏地挺身', youtube_id: 'IODxDxX7oi4', reps: 15, sets: 3, rest: 45, equipment: ['none'], split: 'upper' },
  { id: 'pike-push', name: 'Pike Push-ups', name_zh: '倒V肩推', youtube_id: 'T4rnpJhyxLY', reps: 10, sets: 3, rest: 60, equipment: ['none'], split: 'upper', avoidIf: ['shoulder'] },
  { id: 'dips-chair', name: 'Chair Dips', name_zh: '椅撐臂屈伸', youtube_id: '6kALZikKBtc', reps: 12, sets: 3, rest: 60, equipment: ['none'], split: 'upper', avoidIf: ['shoulder', 'wrist'] },
  { id: 'inverted-row', name: 'Inverted Rows', name_zh: '反向列', youtube_id: 'w-PL77Umd28', reps: 10, sets: 3, rest: 60, equipment: ['none'], split: 'upper' },
  { id: 'plank', name: 'Plank', name_zh: '棒式', youtube_id: 'pSHjTRCQxIw', reps: 30, sets: 3, rest: 45, equipment: ['none'], split: 'upper' },

  // 下肢 — 槓鈴/健身房
  { id: 'squat', name: 'Barbell Squat', name_zh: '槓鈴深蹲', youtube_id: 'aclHktwnyYs', reps: 8, sets: 4, rest: 120, equipment: ['barbell', 'gym'], split: 'lower', avoidIf: ['knee'] },
  { id: 'deadlift', name: 'Deadlift', name_zh: '硬舉', youtube_id: 'V1Y_CziDszo', reps: 6, sets: 3, rest: 120, equipment: ['barbell', 'gym'], split: 'lower', avoidIf: ['back'] },
  { id: 'leg-press', name: 'Leg Press', name_zh: '腿推機', youtube_id: 'IZxyjW7MIAI', reps: 10, sets: 3, rest: 90, equipment: ['gym'], split: 'lower', avoidIf: ['knee'] },
  { id: 'rdl', name: 'Romanian Deadlift', name_zh: '羅馬尼亞硬舉', youtube_id: 'V1Y_CziDszo', reps: 10, sets: 3, rest: 90, equipment: ['barbell', 'dumbbells', 'gym'], split: 'lower', avoidIf: ['back'] },
  // 下肢 — 啞鈴
  { id: 'goblet-squat', name: 'Goblet Squat', name_zh: '啞鈴高腳杯深蹲', youtube_id: 'aclHktwnyYs', reps: 10, sets: 3, rest: 75, equipment: ['dumbbells'], split: 'lower', avoidIf: ['knee'] },
  { id: 'db-lunge', name: 'Dumbbell Lunges', name_zh: '啞鈴弓步', youtube_id: 'Z2ECwLW4Alk', reps: 10, sets: 3, rest: 75, equipment: ['dumbbells'], split: 'lower', avoidIf: ['knee'] },
  { id: 'db-rdl', name: 'Dumbbell RDL', name_zh: '啞鈴羅馬尼亞硬舉', youtube_id: 'V1Y_CziDszo', reps: 10, sets: 3, rest: 75, equipment: ['dumbbells'], split: 'lower', avoidIf: ['back'] },
  // 下肢 — 徒手
  { id: 'body-squat', name: 'Bodyweight Squat', name_zh: '徒手深蹲', youtube_id: 'aclHktwnyYs', reps: 15, sets: 3, rest: 60, equipment: ['none'], split: 'lower', avoidIf: ['knee'] },
  { id: 'lunges', name: 'Lunges', name_zh: '弓步蹲', youtube_id: 'Z2ECwLW4Alk', reps: 12, sets: 3, rest: 60, equipment: ['none'], split: 'lower', avoidIf: ['knee'] },
  { id: 'glute-bridge', name: 'Glute Bridge', name_zh: '臀橋', youtube_id: 'OUgsJ8-Vi0E', reps: 15, sets: 3, rest: 60, equipment: ['none'], split: 'lower' },
  { id: 'calf-raise', name: 'Calf Raises', name_zh: '提踵', youtube_id: 'gwLzBJpmKZQ', reps: 15, sets: 3, rest: 45, equipment: ['none'], split: 'lower' },
  { id: 'step-ups', name: 'Step-ups', name_zh: '登階', youtube_id: 'Z2ECwLW4Alk', reps: 10, sets: 3, rest: 60, equipment: ['none'], split: 'lower', avoidIf: ['knee'] },
  { id: 'hip-thrust', name: 'Hip Thrust', name_zh: '臀推', youtube_id: 'OUgsJ8-Vi0E', reps: 12, sets: 3, rest: 75, equipment: ['barbell', 'dumbbells', 'gym'], split: 'lower' },
  { id: 'box-squat', name: 'Box Squat', name_zh: '箱式深蹲', youtube_id: 'aclHktwnyYs', reps: 10, sets: 3, rest: 75, equipment: ['gym', 'barbell'], split: 'lower' },
  { id: 'sumo-squat', name: 'Sumo Squat', name_zh: '相撲深蹲', youtube_id: 'aclHktwnyYs', reps: 12, sets: 3, rest: 60, equipment: ['dumbbells', 'none'], split: 'lower' },
  { id: 'wall-sit', name: 'Wall Sit', name_zh: '靠牆蹲', youtube_id: 'aclHktwnyYs', reps: 30, sets: 3, rest: 45, equipment: ['none'], split: 'lower' },
  { id: 'side-plank', name: 'Side Plank', name_zh: '側棒式', youtube_id: 'pSHjTRCQxIw', reps: 25, sets: 3, rest: 45, equipment: ['none'], split: 'lower' },
]

const STRENGTH_EXERCISES_PER_SESSION = 4
const WARMUP_MINS = 5
const COOLDOWN_MINS = 5

/** 正規化 onboarding / DB 的器材欄位 */
export function normalizeUserEquipment(raw: string[] | null | undefined): EquipTag[] {
  if (!raw?.length) return ['none']

  const mapped = new Set<EquipTag>()
  for (const item of raw) {
    const s = String(item).toLowerCase()
    if (s === 'none' || /無器材|徒手|沒有/.test(item)) {
      mapped.add('none')
      continue
    }
    if (/啞鈴|dumbbell/.test(s)) mapped.add('dumbbells')
    if (/槓鈴|barbell/.test(s)) mapped.add('barbell')
    if (/彈力|band/.test(s)) mapped.add('resistance_bands')
    if (/跳繩|jump.?rope/.test(s)) mapped.add('jump_rope')
    if (/引體|pull.?up/.test(s)) mapped.add('pull_up_bar')
    if (/健身|gym|器械|飛輪|划船機|滑步機/.test(s)) mapped.add('gym')
  }

  const tags = [...mapped]
  if (!tags.length || (tags.length === 1 && tags[0] === 'none')) return ['none']
  return tags.filter(t => t !== 'none')
}

function isBodyweightOnly(userEquipment: EquipTag[]): boolean {
  return userEquipment.length === 1 && userEquipment[0] === 'none'
}

function userHasEquipment(userEquipment: EquipTag[], required: EquipTag[]): boolean {
  if (required.every(r => r === 'none')) return true
  if (isBodyweightOnly(userEquipment)) {
    return required.includes('none')
  }
  return required.some(r => userEquipment.includes(r))
}

function filterExercises(
  split: 'upper' | 'lower',
  userEquipment: EquipTag[],
  injuries: { knee: boolean; back: boolean; shoulder: boolean; wrist: boolean }
): ExerciseTemplate[] {
  return EXERCISE_POOL.filter(ex => {
    if (ex.split !== split) return false
    if (!userHasEquipment(userEquipment, ex.equipment)) return false
    if (injuries.knee && ex.avoidIf?.includes('knee')) return false
    if (injuries.back && ex.avoidIf?.includes('back')) return false
    if (injuries.shoulder && ex.avoidIf?.includes('shoulder')) return false
    if (injuries.wrist && ex.avoidIf?.includes('wrist')) return false
    return true
  })
}

function sortPoolByEquipment(pool: ExerciseTemplate[], userEquipment: EquipTag[]): ExerciseTemplate[] {
  if (isBodyweightOnly(userEquipment)) {
    return [...pool].sort((a, b) => {
      const aBody = a.equipment.includes('none') ? 0 : 1
      const bBody = b.equipment.includes('none') ? 0 : 1
      return aBody - bBody
    })
  }
  return [...pool].sort((a, b) => {
    const aBody = a.equipment.every(e => e === 'none') ? 1 : 0
    const bBody = b.equipment.every(e => e === 'none') ? 1 : 0
    return aBody - bBody
  })
}

function pickSessionExercises(
  pool: ExerciseTemplate[],
  sessionIndex: number,
  count: number,
  userEquipment: EquipTag[]
): ExerciseTemplate[] {
  let sorted = sortPoolByEquipment(pool, userEquipment)
  if (isBodyweightOnly(userEquipment)) {
    sorted = sorted.filter(ex => ex.equipment.includes('none'))
  } else if (!isBodyweightOnly(userEquipment)) {
    const withEquip = sorted.filter(ex => !ex.equipment.every(e => e === 'none'))
    if (withEquip.length >= count) sorted = withEquip
  }
  if (sorted.length === 0) return []

  const step = Math.max(1, Math.floor(sorted.length / 3))
  const start = (sessionIndex * step) % sorted.length
  const picked: ExerciseTemplate[] = []
  const used = new Set<string>()
  for (let i = 0; picked.length < count && i < sorted.length * 2; i++) {
    const ex = sorted[(start + i) % sorted.length]!
    if (used.has(ex.id)) continue
    used.add(ex.id)
    picked.push(ex)
  }
  return picked
}

function estimateExerciseMins(sets: number, reps: number, restSecs: number): number {
  const workSecs = sets * (reps * 3 + 25)
  const restTotal = Math.max(0, sets - 1) * restSecs
  return (workSecs + restTotal) / 60
}

function toWorkoutSet(
  ex: ExerciseTemplate,
  volumeMult: number,
  extraNote = ''
): ExerciseSet {
  const sets = Math.max(2, Math.round(ex.sets * volumeMult))
  const isHold = ['plank', 'wall-sit', 'side-plank'].includes(ex.id)
  return {
    exercise_id: ex.id,
    exercise_name: ex.name,
    exercise_name_zh: ex.name_zh,
    youtube_id: ex.youtube_id,
    sets,
    reps: isHold ? null : ex.reps,
    duration_secs: isHold ? ex.reps : null,
    rest_secs: ex.rest,
    notes: isHold ? `每組 ${ex.reps} 秒${extraNote ? `，${extraNote}` : ''}` : extraNote,
  }
}

// 有氧選項 — equipment 標記所需器材
const cardioExercises: {
  id: string
  name: string
  name_zh: string
  duration: number
  intensity: string
  lowImpact: boolean
  equipment: EquipTag[]
  homePriority?: number
}[] = [
  {
    id: 'running',
    name: 'Running',
    name_zh: '慢跑',
    duration: 1800,
    intensity: '中等 (130-150 BPM)',
    lowImpact: false,
    equipment: ['none'],
    homePriority: 1,
  },
  {
    id: 'brisk-walk',
    name: 'Brisk Walk',
    name_zh: '快走',
    duration: 2100,
    intensity: '輕度-中等',
    lowImpact: true,
    equipment: ['none'],
    homePriority: 0,
  },
  {
    id: 'high-knees',
    name: 'High Knees',
    name_zh: '原地高抬腿',
    duration: 1200,
    intensity: '中等',
    lowImpact: false,
    equipment: ['none'],
    homePriority: 2,
  },
  {
    id: 'jumping-jacks',
    name: 'Jumping Jacks',
    name_zh: '開合跳',
    duration: 900,
    intensity: '中等-高',
    lowImpact: false,
    equipment: ['none'],
    homePriority: 3,
  },
  {
    id: 'jump-rope',
    name: 'Jump Rope',
    name_zh: '跳繩',
    duration: 1200,
    intensity: '中等-高強度 (140-160 BPM)',
    lowImpact: false,
    equipment: ['jump_rope'],
    homePriority: 4,
  },
  {
    id: 'cycling',
    name: 'Cycling',
    name_zh: '騎車',
    duration: 1800,
    intensity: '中等 (100-120 RPM)',
    lowImpact: true,
    equipment: ['gym'],
  },
  {
    id: 'rowing',
    name: 'Rowing',
    name_zh: '划船機',
    duration: 1800,
    intensity: '中等 (24-28 strokes/min)',
    lowImpact: true,
    equipment: ['gym'],
  },
  {
    id: 'swimming',
    name: 'Swimming',
    name_zh: '游泳',
    duration: 1800,
    intensity: '中等',
    lowImpact: true,
    equipment: ['gym'],
  },
]

function pickCardioExercise(
  userEquipment: EquipTag[],
  hasKneeInjury: boolean,
  dayIndex: number,
  volumeMult: number
) {
  let pool = cardioExercises.filter(c => userHasEquipment(userEquipment, c.equipment))
  if (hasKneeInjury) pool = pool.filter(c => c.lowImpact)
  if (!pool.length) {
    pool = cardioExercises.filter(c => c.equipment.includes('none'))
  }
  if (isBodyweightOnly(userEquipment)) {
    pool = [...pool].sort((a, b) => (a.homePriority ?? 9) - (b.homePriority ?? 9))
  }
  const cardio = pool[dayIndex % pool.length]!
  const cardioDuration = Math.round(cardio.duration * volumeMult)
  return { cardio, cardioDuration }
}

export function generateWorkoutPlan(
  dayIndex: number,
  fitnessLevel: string,
  injuries: string[] = [],
  goalType: string = 'lose_fat',
  equipment: string[] = [],
  workoutModifier: 'easier' | 'harder' | null = null
) {
  const hasKneeInjury = injuries.some(
    i => String(i).toLowerCase().includes('膝') || String(i).toLowerCase().includes('knee')
  )
  const hasBackInjury = injuries.some(
    i => String(i).toLowerCase().includes('腰') || String(i).toLowerCase().includes('back')
  )
  const hasShoulderInjury = injuries.some(
    i => String(i).toLowerCase().includes('肩') || String(i).toLowerCase().includes('shoulder')
  )
  const hasWristInjury = injuries.some(
    i => String(i).toLowerCase().includes('腕') || String(i).toLowerCase().includes('wrist')
  )
  const injuryFlags = {
    knee: hasKneeInjury,
    back: hasBackInjury,
    shoulder: hasShoulderInjury,
    wrist: hasWristInjury,
  }

  const userEquipment = normalizeUserEquipment(equipment)
  const levelMult =
    fitnessLevel === 'advanced' ? 1.15 : fitnessLevel === 'beginner' ? 0.85 : 1
  const modMult = workoutModifier === 'easier' ? 0.85 : workoutModifier === 'harder' ? 1.1 : 1
  const volumeMult = levelMult * modMult

  // 依目標決定每週訓練配置
  const schedules: Record<string, { strength: number[]; cardio: number[]; rest: number }> = {
    lose_fat: { strength: [0, 2, 4], cardio: [1, 3, 5], rest: 6 },
    lose_weight: { strength: [0, 2, 4], cardio: [1, 3, 5], rest: 6 },
    gain_muscle: { strength: [0, 1, 3, 4], cardio: [2], rest: 6 },
    body_recomp: { strength: [0, 2, 4], cardio: [1, 5], rest: 6 },
    maintain: { strength: [0, 3], cardio: [2], rest: 6 },
  }
  const schedule = schedules[goalType] ?? schedules.lose_fat
  const dayOfWeek = dayIndex % 7
  const isStrengthDay = schedule.strength.includes(dayOfWeek)
  const isCardioDay = schedule.cardio.includes(dayOfWeek)
  const isRestDay = dayOfWeek === schedule.rest

  if (isRestDay) {
    return {
      type: 'rest',
      type_zh: '休息日',
      warmup: [],
      main: [],
      cooldown: [
        {
          exercise_id: 'stretch-1',
          exercise_name: 'Stretching',
          exercise_name_zh: '伸展',
          youtube_id: 'J8epyPNR-x0',
          sets: 1,
          reps: null,
          duration_secs: 600,
          rest_secs: 0,
          notes: '全身放鬆伸展 10 分鐘',
        },
      ],
      estimated_duration_mins: 10,
      calories_burned_est: 50,
    }
  }

  if (isStrengthDay) {
    const sessionIdx = schedule.strength.indexOf(dayOfWeek)
    const isUpperDay = sessionIdx % 2 === 0
    const split = isUpperDay ? 'upper' : 'lower'
    let pool = filterExercises(split, userEquipment, injuryFlags)

    // 器材不足時退回徒手
    if (pool.length < STRENGTH_EXERCISES_PER_SESSION) {
      pool = filterExercises(split, ['none'], injuryFlags)
    }

    const selected = pickSessionExercises(pool, sessionIdx, STRENGTH_EXERCISES_PER_SESSION, userEquipment)
    const main = selected.map((ex, idx) =>
      toWorkoutSet(
        ex,
        volumeMult,
        hasBackInjury && idx === 0
          ? '控制重量，腰背打直'
          : hasShoulderInjury && ex.avoidIf?.includes('shoulder')
            ? '肩不舒服就換靠牆伏地挺身'
            : ''
      )
    )

    const mainMins =
      main.reduce(
        (sum, s, i) => sum + estimateExerciseMins(s.sets, s.reps ?? 10, selected[i]!.rest),
        0
      ) +
      main.length * 2
    const totalMins = Math.round(WARMUP_MINS + mainMins + COOLDOWN_MINS)

    return {
      type: 'strength',
      type_zh: isUpperDay ? '上肢重訓' : '下肢重訓',
      warmup: [
        {
          exercise_id: 'warmup-cardio',
          exercise_name: 'Warm-up',
          exercise_name_zh: '5分鐘熱身',
          youtube_id: null,
          sets: 1,
          reps: null,
          duration_secs: WARMUP_MINS * 60,
          rest_secs: 0,
          notes: '動態伸展 + 輕度有氧',
        },
      ],
      main,
      cooldown: [
        {
          exercise_id: 'cooldown-stretch',
          exercise_name: 'Stretching',
          exercise_name_zh: '伸展',
          youtube_id: null,
          sets: 1,
          reps: null,
          duration_secs: COOLDOWN_MINS * 60,
          rest_secs: 0,
          notes: '放鬆訓練肌群',
        },
      ],
      estimated_duration_mins: totalMins,
      calories_burned_est: Math.round(totalMins * 6),
    }
  }

  if (isCardioDay) {
    const { cardio, cardioDuration } = pickCardioExercise(
      userEquipment,
      hasKneeInjury,
      dayIndex,
      volumeMult
    )

    return {
      type: 'cardio',
      type_zh: '有氧運動',
      warmup: [
        {
          exercise_id: 'warmup-light',
          exercise_name: 'Light Warm-up',
          exercise_name_zh: '輕度熱身',
          youtube_id: null,
          sets: 1,
          reps: null,
          duration_secs: 300,
          rest_secs: 0,
          notes: '逐步升溫 5 分鐘',
        },
      ],
      main: [
        {
          exercise_id: cardio.id,
          exercise_name: cardio.name,
          exercise_name_zh: cardio.name_zh,
          youtube_id: null,
          sets: 1,
          reps: null,
          duration_secs: cardioDuration,
          rest_secs: 0,
          notes: `強度：${cardio.intensity}`,
        },
      ],
      cooldown: [
        {
          exercise_id: 'cooldown-cardio',
          exercise_name: 'Cool Down',
          exercise_name_zh: '緩和',
          youtube_id: null,
          sets: 1,
          reps: null,
          duration_secs: 300,
          rest_secs: 0,
          notes: '步行 5 分鐘，心率恢復',
        },
      ],
      estimated_duration_mins: Math.round(cardioDuration / 60 + 10),
      calories_burned_est: Math.round(cardioDuration / 60 * 12),
    }
  }

  return {
    type: 'rest',
    type_zh: '休息日',
    warmup: [],
    main: [],
    cooldown: [],
    estimated_duration_mins: 0,
    calories_burned_est: 0,
  }
}
