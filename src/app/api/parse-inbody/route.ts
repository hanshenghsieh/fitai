import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseInBodyImage } from '@/lib/claude/client'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { storagePath } = await request.json()
    if (!storagePath) return NextResponse.json({ error: 'Missing storagePath' }, { status: 400 })

    // Download image from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('inbody-uploads')
      .download(storagePath)
    if (downloadError) throw downloadError

    const buffer = await fileData.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const mimeType = fileData.type || 'image/jpeg'

    const { data: parsed } = await parseInBodyImage(base64, mimeType)

    // Update inbody_uploads record
    const { error: updateError } = await supabase.from('inbody_uploads')
      .update({ parsed_data: parsed, parsing_status: 'success' })
      .eq('user_id', user.id)
      .eq('storage_path', storagePath)
    if (updateError) throw updateError

    // Auto-update user profile with parsed values (if confidence >= medium)
    if (parsed.confidence !== 'low') {
      const profileUpdates: Record<string, number> = {}
      if (parsed.weight_kg) profileUpdates.weight_kg = parsed.weight_kg
      if (parsed.body_fat_pct) profileUpdates.body_fat_pct = parsed.body_fat_pct
      if (parsed.muscle_mass_kg) profileUpdates.muscle_mass_kg = parsed.muscle_mass_kg

      if (Object.keys(profileUpdates).length > 0) {
        await supabase.from('user_profiles').update(profileUpdates).eq('id', user.id)
      }

      // Save body measurement
      await supabase.from('body_measurements').insert({
        user_id: user.id,
        measured_at: new Date().toISOString().split('T')[0],
        weight_kg: parsed.weight_kg,
        body_fat_pct: parsed.body_fat_pct,
        muscle_mass_kg: parsed.muscle_mass_kg,
        waist_cm: parsed.waist_cm,
      })
    }

    return NextResponse.json({ success: true, data: parsed })
  } catch (err) {
    console.error('InBody parse error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Parse failed' }, { status: 500 })
  }
}
