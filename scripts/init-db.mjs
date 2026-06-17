import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import pkg from 'pg'
const { Client } = pkg

const __dirname = dirname(fileURLToPath(import.meta.url))

// Parse .env.local
const envContent = readFileSync(join(__dirname, '..', '.env.local'), 'utf8')
const env = {}
for (const line of envContent.split('\n')) {
  const m = line.match(/^([^#\s=][^=]*)=(.*)$/)
  if (m) env[m[1].trim()] = m[2].trim()
}

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL']
const SERVICE_KEY = env['SUPABASE_SERVICE_ROLE_KEY']

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Parse Supabase URL to get host
const url = new URL(SUPABASE_URL)
const host = url.hostname
const projectId = url.hostname.split('.')[0]

// Read schema.sql
const schema = readFileSync(join(__dirname, '..', 'supabase', 'schema.sql'), 'utf8')

const client = new Client({
  host,
  port: 5432,
  database: 'postgres',
  user: 'postgres.'+projectId,
  password: SERVICE_KEY,
  ssl: { rejectUnauthorized: false },
})

async function init() {
  try {
    console.log('Connecting to Supabase PostgreSQL...')
    await client.connect()
    console.log('✓ Connected')

    console.log('Executing schema...')
    await client.query(schema)
    console.log('✓ Schema created successfully')

    await client.end()
    console.log('✅ Database initialized!')
  } catch (err) {
    console.error('❌ Error:', err.message)
    await client.end().catch(() => {})
    process.exit(1)
  }
}

init()
