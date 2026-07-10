import { NextRequest } from 'next/server'
import { requireApiUser } from '@/lib/api/auth'
import { handleCorsOptions, jsonWithCors } from '@/lib/api/cors'
import { parseInBodyImage } from '@/lib/claude/client'

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request)
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiUser(request)
    if (!auth.ok) return auth.response
    const { user, supabase } = auth

    const { storagePath } = await request.json()
    if (!storagePath) return jsonWithCors({ error: 'Missing storagePath' }, request, { status: 400 })

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('inbody-uploads')
      .download(storagePath)
    if (downloadError) throw downloadError

    const buffer = await fileData.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    const mimeType = fileData.type || 'image/jpeg'

    const { data: parsed } = await parseInBodyImage(base64, mimeType)

    const { error: updateError } = await supabase.from('inbody_uploads')
      .update({ parsed_data: parsed, parsing_status: 'success' })
      .eq('user_id', user.id)
      .eq('storage_path', storagePath)
    if (updateError) throw updateError

    if (parsed.confidence !== 'low') {
      const profileUpdates: Record<string, number> = {}
      if (parsed.weight_kg) profileUpdates.weight_kg = parsed.weight_kg
      if (parsed.body_fat_pct) profileUpdates.body_fat_pct = parsed.body_fat_pct
      if (parsed.muscle_mass_kg) profileUpdates.muscle_mass_kg = parsed.muscle_mass_kg

      if (Object.keys(profileUpdates).length > 0) {
        await supabase.from('user_profiles').update(profileUpdates).eq('id', user.id)
      }

      await supabase.from('body_measurements').insert({
        user_id: user.id,
        measured_at: new Date().toISOString().split('T')[0],
        weight_kg: parsed.weight_kg,
        body_fat_pct: parsed.body_fat_pct,
        muscle_mass_kg: parsed.muscle_mass_kg,
        waist_cm: parsed.waist_cm,
      })
    }

    return jsonWithCors({ success: true, data: parsed }, request)
  } catch (err) {
    console.error('InBody parse error:', err)
    return jsonWithCors({ error: err instanceof Error ? err.message : 'Parse failed' }, request, { status: 500 })
  }
}
