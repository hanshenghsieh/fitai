export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { requireApiUser } from '@/lib/api/auth'
import { handleCorsOptions, jsonWithCors } from '@/lib/api/cors'
import { getNutritionDayKey } from '@/lib/timezone'
import {
  getCalorieBankRow,
  syncCalorieBankForUser,
} from '@/lib/banks/calorie-bank-store'
import type { UserProfile } from '@/types'

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request)
}

export async function GET(request: NextRequest) {
  const auth = await requireApiUser(request)
  if (!auth.ok) return auth.response
  const { user, supabase } = auth

  const dateParam = request.nextUrl.searchParams.get('date')
  const date =
    typeof dateParam === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? dateParam
      : getNutritionDayKey()
  const row = await getCalorieBankRow(supabase, user.id, date)
  return jsonWithCors({ bank: row }, request)
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser(request)
  if (!auth.ok) return auth.response
  const { user, supabase } = auth

  const body = await request.json().catch(() => ({}))
  const date = typeof body.date === 'string' ? body.date : getNutritionDayKey()
  const calories = num(body.normal_target_kcal ?? body.target_kcal)
  const protein_g = num(body.target_protein_g)
  const fat_g = num(body.target_fat_g)
  const carbs_g = num(body.target_carbs_g)
  const actualKcal = num(body.actual_kcal)
  const actualProteinG = num(body.actual_protein_g)
  const actualFatG = num(body.actual_fat_g)
  const actualCarbsG = num(body.actual_carbs_g)

  if (calories <= 0) {
    return jsonWithCors({ error: 'normal_target_kcal required' }, request, { status: 400 })
  }
  if (actualKcal < 0) {
    return jsonWithCors({ error: 'actual_kcal required' }, request, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  const bank = await syncCalorieBankForUser({
    supabase,
    userId: user.id,
    date,
    dailyTargets: { calories, protein_g, fat_g, carbs_g },
    actualKcal,
    actualProteinG,
    actualFatG,
    actualCarbsG,
    profile: profile as UserProfile | null,
  })

  if (!bank || !bank.persisted) {
    return jsonWithCors(
      {
        error: 'calorie_bank table missing or write failed — run supabase/migrations/20250618120000_calorie_bank.sql',
        bank,
      },
      request,
      { status: 503 }
    )
  }

  return jsonWithCors({ bank }, request)
}
