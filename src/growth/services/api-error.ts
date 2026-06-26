import { NextResponse } from 'next/server'
import { GROWTH_SETUP_INSTRUCTIONS, isGrowthTableMissingError } from '@/growth/storage/errors'

export function growthApiError(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : fallback
  if (isGrowthTableMissingError(message)) {
    return NextResponse.json(
      {
        error: '資料表 growth_posts 尚未建立',
        code: 'GROWTH_TABLE_MISSING',
        setup: GROWTH_SETUP_INSTRUCTIONS,
        sqlPath: 'supabase/migrations/20250626120000_growth_posts.sql',
        sqlEditorUrl:
          'https://supabase.com/dashboard/project/ofbxybkshmbrdffcywyl/sql/new',
      },
      { status: 503 }
    )
  }
  return NextResponse.json({ error: message }, { status: 500 })
}
