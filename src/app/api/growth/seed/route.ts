export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { MOCK_GROWTH_POSTS } from '@/growth/mock/seed-posts'
import { clearDemoGrowthPosts, seedGrowthPosts } from '@/growth/storage/posts'
import { processPostAnalysis } from '@/growth/services/post-pipeline'
import { getGrowthSupabase } from '@/growth/services/supabase'
import { growthApiError } from '@/growth/services/api-error'

export async function POST() {
  try {
    const supabase = getGrowthSupabase()
    await clearDemoGrowthPosts(supabase)
    const count = await seedGrowthPosts(supabase, MOCK_GROWTH_POSTS)

    const { data: inserted } = await supabase
      .from('growth_posts')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(count)

    for (const row of inserted ?? []) {
      await processPostAnalysis(supabase, row.id)
    }

    return NextResponse.json({
      seeded: count,
      message: `已匯入 ${count} 篇示範資料（無假連結），完成 AI 分析`,
    })
  } catch (err) {
    return growthApiError(err, 'Seed failed')
  }
}
