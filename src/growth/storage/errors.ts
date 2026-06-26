export function isGrowthTableMissingError(message: string): boolean {
  return (
    message.includes('growth_posts') &&
    (message.includes('schema cache') ||
      message.includes('PGRST205') ||
      message.includes('does not exist'))
  )
}

export const GROWTH_SETUP_INSTRUCTIONS = `資料表 growth_posts 尚未建立。

請擇一方式建立：

方式 A — Supabase SQL Editor（建議）
1. 開啟 https://supabase.com/dashboard/project/ofbxybkshmbrdffcywyl/sql/new
2. 貼上 supabase/migrations/20250626120000_growth_posts.sql 內容
3. 按 Run

方式 B — 本機指令
1. 在 .env.local 加入 SUPABASE_DB_PASSWORD（Supabase → Project Settings → Database）
2. 執行 npm run migrate:growth-posts`
