/**
 * Print growth_posts migration SQL and Supabase SQL Editor link.
 */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const migrationPath = resolve(root, 'supabase/migrations/20250626120000_growth_posts.sql')
const sql = readFileSync(migrationPath, 'utf8')

console.log('=== BetterBit Growth — create growth_posts table ===\n')
console.log('1. Open Supabase SQL Editor:')
console.log('   https://supabase.com/dashboard/project/ofbxybkshmbrdffcywyl/sql/new\n')
console.log('2. Paste and run this SQL:\n')
console.log(sql)
console.log('\n3. Or add SUPABASE_DB_PASSWORD to .env.local and run:')
console.log('   npm run migrate:growth-posts\n')
