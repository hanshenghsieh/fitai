export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const date = getNutritionDayKey()
  const row = await getCalorieBankRow(supabase, user.id, date)
  return NextResponse.json({ bank: row })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
    return NextResponse.json({ error: 'normal_target_kcal required' }, { status: 400 })
  }
  if (actualKcal < 0) {
    return NextResponse.json({ error: 'actual_kcal required' }, { status: 400 })
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
    return NextResponse.json(
      {
        error: 'calorie_bank table missing or write failed — run supabase/migrations/20250618120000_calorie_bank.sql',
        bank,
      },
      { status: 503 }
    )
  }

  return NextResponse.json({ bank })
}
