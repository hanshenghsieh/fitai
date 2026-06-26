export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { clearDemoGrowthPosts } from '@/growth/storage/posts'
import { getGrowthSupabase } from '@/growth/services/supabase'
import { growthApiError } from '@/growth/services/api-error'

export async function DELETE() {
  try {
    const supabase = getGrowthSupabase()
    const removed = await clearDemoGrowthPosts(supabase)
    return NextResponse.json({ removed, message: `已清除 ${removed} 篇示範資料` })
  } catch (err) {
    return growthApiError(err, 'Clear demo failed')
  }
}
