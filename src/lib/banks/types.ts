/** BetterBit OS — internal bank state (NASA inside) */

export interface CalorieBank {
  dailyPaceKcal: number
  todayTargetKcal: number
  todayLoggedKcal: number
  /** Positive = under internal pace */
  runningBalanceKcal: number
  totalBudgetKcal: number
  daysRemaining: number
}

export interface ProteinBank {
  dailyTargetG: number
  todayLoggedG: number
  gapG: number
}

export interface ExerciseBank {
  weeklyTargetSessions: number
  completedSessions: number
  remainingSessions: number
}

export interface UserBanks {
  calorie: CalorieBank
  protein: ProteinBank
  exercise: ExerciseBank
}

export interface FoodLogEntry {
  id: string
  name: string
  store?: string
  calories: number
  protein_g: number
  logged_at: string
  user_declared: true
  source: 'search' | 'dice' | 'plan' | 'free_text'
}
