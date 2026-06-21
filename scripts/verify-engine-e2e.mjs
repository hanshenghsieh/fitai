import {
  syncCalorieBankRow,
  tickRecoveryFromPrevious,
  recoveryTargetsForDayOffsets,
  isRecoveryActive,
} from '../src/lib/engines/calorie-bank-engine.ts'

const T = 1700
const F = 1500
const U = 'verify'

const caseA = syncCalorieBankRow({
  userId: U,
  date: 'd1',
  normalTargetKcal: T,
  calorieFloor: F,
  actualKcal: 1680,
  previousRow: null,
  existingToday: null,
})

const caseB1 = syncCalorieBankRow({
  userId: U,
  date: 'd1',
  normalTargetKcal: T,
  calorieFloor: F,
  actualKcal: 2150,
  previousRow: null,
  existingToday: null,
})
const caseB2 = tickRecoveryFromPrevious(caseB1, T, F)

const caseC1 = syncCalorieBankRow({
  userId: U,
  date: 'd1',
  normalTargetKcal: T,
  calorieFloor: F,
  actualKcal: 3200,
  previousRow: null,
  existingToday: null,
})
const caseCweek = recoveryTargetsForDayOffsets(
  T,
  caseC1.spread_days_remaining,
  caseC1.daily_adjust_kcal,
  F,
  7
)

const d1 = syncCalorieBankRow({
  userId: U,
  date: 'd1',
  normalTargetKcal: T,
  calorieFloor: F,
  actualKcal: 3200,
  previousRow: null,
  existingToday: null,
})
const d2tick = tickRecoveryFromPrevious(d1, T, F)
const d2partial = {
  user_id: U,
  date: 'd2',
  daily_target_kcal: T,
  internal_target_kcal: d2tick.internal_target_kcal,
  actual_kcal: 0,
  delta_kcal: 0,
  running_balance_kcal: 0,
  recovery_balance_kcal: d2tick.recovery_balance_kcal,
  spread_days_remaining: d2tick.spread_days_remaining,
  daily_adjust_kcal: d2tick.daily_adjust_kcal,
}
const d2 = syncCalorieBankRow({
  userId: U,
  date: 'd2',
  normalTargetKcal: T,
  calorieFloor: F,
  actualKcal: 2500,
  previousRow: d1,
  existingToday: d2partial,
})

let prev = caseC1
const caseE = []
for (let i = 0; i < 7; i++) {
  const t = tickRecoveryFromPrevious(prev, T, F)
  caseE.push({
    day: i + 1,
    internal: t.internal_target_kcal,
    recovery: t.recovery_balance_kcal,
    spread: t.spread_days_remaining,
    active: isRecoveryActive(t),
  })
  if (!isRecoveryActive(t)) break
  prev = {
    ...prev,
    date: `x${i}`,
    internal_target_kcal: t.internal_target_kcal,
    recovery_balance_kcal: t.recovery_balance_kcal,
    spread_days_remaining: t.spread_days_remaining,
    daily_adjust_kcal: t.daily_adjust_kcal,
    actual_kcal: 1700,
  }
}

const db1 = syncCalorieBankRow({
  userId: 'user-a',
  date: '2026-06-10',
  normalTargetKcal: 1700,
  calorieFloor: 1500,
  actualKcal: 3200,
  previousRow: null,
  existingToday: null,
})
const db2 = syncCalorieBankRow({
  userId: 'user-a',
  date: '2026-06-11',
  normalTargetKcal: 1700,
  calorieFloor: 1500,
  actualKcal: 0,
  previousRow: db1,
  existingToday: null,
})

console.log(
  JSON.stringify(
    {
      caseA: {
        recovery: caseA.recovery_balance_kcal,
        spread: caseA.spread_days_remaining,
        internal: caseA.internal_target_kcal,
      },
      caseB: {
        spread: caseB1.spread_days_remaining,
        adjust: caseB1.daily_adjust_kcal,
        day2Internal: caseB2.internal_target_kcal,
      },
      caseC: {
        spread: caseC1.spread_days_remaining,
        adjust: caseC1.daily_adjust_kcal,
        recovery: caseC1.recovery_balance_kcal,
        week: caseCweek,
      },
      caseD: {
        d1Recovery: d1.recovery_balance_kcal,
        d2Recovery: d2.recovery_balance_kcal,
        d2Spread: d2.spread_days_remaining,
      },
      caseE: caseE,
      db: {
        db1Recovery: db1.recovery_balance_kcal,
        db1Spread: db1.spread_days_remaining,
        db2Recovery: db2.recovery_balance_kcal,
        db2Spread: db2.spread_days_remaining,
        db2Internal: db2.internal_target_kcal,
      },
    },
    null,
    2
  )
)
