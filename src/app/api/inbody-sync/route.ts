import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface InBodyData {
  body_fat_pct?: number
  muscle_mass_kg?: number
  weight_kg?: number
  body_water_pct?: number
  mineral_mass_kg?: number
  protein_mass_kg?: number
  bmr_kcal?: number
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { inbodyUserId } = await req.json()

    if (!inbodyUserId) {
      return NextResponse.json({ error: 'Missing inbodyUserId' }, { status: 400 })
    }

    // 這裡會呼叫 INBODY 的 API 獲取最新數據
    // const inbodyData = await fetchFromInBodyAPI(inbodyUserId)

    // 模擬 INBODY 數據（實際應從 INBODY API 獲取）
    const inbodyData: InBodyData = {
      body_fat_pct: 28.2,
      muscle_mass_kg: 52.8,
      weight_kg: 84.5,
      body_water_pct: 61.5,
      mineral_mass_kg: 3.25,
      protein_mass_kg: 13.8,
      bmr_kcal: 1880,
    }

    // 保存 INBODY 帳戶連接
    const { error: linkError } = await supabase
      .from('inbody_linked_accounts')
      .upsert({
        user_id: user.id,
        inbody_user_id: inbodyUserId,
        last_synced: new Date().toISOString(),
      })

    if (linkError) throw linkError

    // 更新用戶檔案
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        body_fat_pct: inbodyData.body_fat_pct,
        muscle_mass_kg: inbodyData.muscle_mass_kg,
        weight_kg: inbodyData.weight_kg,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) throw updateError

    // 保存歷史數據
    const { error: historyError } = await supabase
      .from('inbody_history')
      .insert({
        user_id: user.id,
        body_fat_pct: inbodyData.body_fat_pct,
        muscle_mass_kg: inbodyData.muscle_mass_kg,
        weight_kg: inbodyData.weight_kg,
        body_water_pct: inbodyData.body_water_pct,
        mineral_mass_kg: inbodyData.mineral_mass_kg,
        protein_mass_kg: inbodyData.protein_mass_kg,
        bmr_kcal: inbodyData.bmr_kcal,
        synced_at: new Date().toISOString(),
      })

    if (historyError) throw historyError

    console.log(`✅ INBODY data synced for user ${user.id}`)

    return NextResponse.json({
      success: true,
      data: inbodyData,
      message: 'INBODY 數據已同步',
    })
  } catch (err) {
    console.error('Error syncing INBODY data:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to sync INBODY data' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 獲取最近的 INBODY 數據
    const { data } = await supabase
      .from('inbody_history')
      .select('*')
      .eq('user_id', user.id)
      .order('synced_at', { ascending: false })
      .limit(10)

    // 獲取關聯的 INBODY 帳戶
    const { data: linkedAccount } = await supabase
      .from('inbody_linked_accounts')
      .select('*')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      history: data || [],
      linked: linkedAccount || null,
    })
  } catch (err) {
    console.error('Error fetching INBODY data:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed' },
      { status: 500 }
    )
  }
}
