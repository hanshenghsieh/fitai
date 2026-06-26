/**
 * Print growth_posts migration SQL and Supabase SQL Editor link.
 */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const migrationPath = resolve(root, 'supabase/migrations/20250626120000_growth_posts.sql')
const migrationPath2 = resolve(root, 'supabase/migrations/20250626130000_growth_posts_posted_at.sql')
const sql = readFileSync(migrationPath, 'utf8')
const sql2 = readFileSync(migrationPath2, 'utf8')

console.log('=== BetterBit Growth — create growth_posts table ===\n')
console.log('1. Open Supabase SQL Editor:')
console.log('   https://supabase.com/dashboard/project/ofbxybkshmbrdffcywyl/sql/new\n')
console.log('2. Paste and run this SQL (if growth_posts does not exist yet):\n')
console.log(sql)
console.log('\n--- If table already exists, also run this migration ---\n')
console.log(sql2)
console.log('\n3. Or add SUPABASE_DB_PASSWORD to .env.local and run:')
console.log('   npm run migrate:growth-posts\n')
