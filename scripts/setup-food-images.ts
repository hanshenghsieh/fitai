/**
 * Bootstrap curated food photos into /public/food-images/
 * Uses Unsplash direct photo URLs (one-time download — never at runtime).
 *
 * Run:  npm run food-images:reset
 */
import { mkdirSync, writeFileSync, existsSync, readdirSync, unlinkSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public/food-images')
const force = process.argv.includes('--force')

/** Unsplash — slug identifies content; downloaded once to /public */
const U = (slug: string) =>
  `https://images.unsplash.com/${slug}?auto=format&fit=crop&w=900&h=900&q=85`

const ASSETS: Record<string, string> = {
  'bento-01.jpg': U('photo-1546069901-ba9599a7e63c'),
  'bento-02.jpg': U('photo-1604908176997-431635796783'),
  'bento-03.jpg': U('photo-1588166528312-58d1032af9f9'),
  'bento-04.jpg': U('photo-1553621042-f6e147245754'),

  'salmon-01.jpg': U('photo-1580959375944-abd7e991f971'),
  'salmon-02.jpg': U('photo-1519708227418-c8fd9a32b9a2'),
  'salmon-03.jpg': U('photo-1467003909585-2f8a72700288'),
  'salmon-04.jpg': U('photo-1534600909179-0c4160c56a98'),

  'noodles-01.jpg': U('photo-1612872085524-1753864569c56'),
  'noodles-02.jpg': U('photo-1569718212165-3a8278d5f624'),
  'noodles-03.jpg': U('photo-1626804475297-41608ea09aeb'),
  'noodles-04.jpg': U('photo-1598866598160-a799edc829e8'),

  'hotpot-01.jpg': U('photo-1547592180-85f173990554'),
  'hotpot-02.jpg': U('photo-1555126634-323283e09041'),
  'hotpot-03.jpg': U('photo-1585036496651-53d5a1e2f62f'),
  'hotpot-04.jpg': U('photo-1595777457583-95e059d581b8'),

  /** 燙青菜 / 沙拉 — green vegetables & bowls */
  'salad-01.jpg': U('photo-1512621776951-a57141f2eefd'),
  'salad-02.jpg': U('photo-1540420773420-3366772f4990'),
  'salad-03.jpg': U('photo-1490645935967-10de6ba16932'),
  'salad-04.jpg': U('photo-1540189549336-e6e99c3679fe'),

  'convenience-01.jpg': U('photo-1606491956689-2ea8660f8830'),
  'convenience-02.jpg': U('photo-1563805042-7684c019e1cb'),
  'convenience-03.jpg': U('photo-1574484286672-58ad806abaee'),
  'convenience-04.jpg': U('photo-1606312619070-d48aeb4a6e48'),

  'fried-01.jpg': U('photo-1562967914-608f82629710'),
  'fried-02.jpg': U('photo-1626087927383-9c090016a639'),
  'fried-03.jpg': U('photo-1567620905732-2d1ec7ab7445'),
  'fried-04.jpg': U('photo-1550547660-d9450f859349'),

  'dessert-01.jpg': U('photo-1551024506-0bccd828d307'),
  'dessert-02.jpg': U('photo-1488477181946-6428a0291840'),
  'dessert-03.jpg': U('photo-1464349095430-e2425d1b0f1e'),
  'dessert-04.jpg': U('photo-1578985545062-69928b1d9587'),

  'drink-01.jpg': U('photo-1495474472287-4d71bcdd2085'),
  'drink-02.jpg': U('photo-1556679343-c7306c1976bc'),
  'drink-03.jpg': U('photo-1544145945-f90425340c7e'),
  'drink-04.jpg': U('photo-1525385133512-4a3c654165bc'),

  'fruit-01.jpg': U('photo-1619566637926-aa988837a9f4'),
  'fruit-02.jpg': U('photo-1571019614242-c5c5dee9f50b'),
  'fruit-03.jpg': U('photo-1464960352-7a4808e4a966'),
  'fruit-04.jpg': U('photo-1566385103862-338061033f34'),

  'snack-01.jpg': U('photo-1509440159596-0249088772ff'),
  'snack-02.jpg': U('photo-1558961363-fa8fdf82db35'),
  'snack-03.jpg': U('photo-1599490659213-4d9d0b125f0c'),
  'snack-04.jpg': U('photo-1481391319762-47dff72954a9'),

  'breakfast-01.jpg': U('photo-1533089860892-a8c6a725886e'),
  'breakfast-02.jpg': U('photo-1525351484163-7529414344d8'),
  'breakfast-03.jpg': U('photo-148472309173-f7a273993fc8'),
  'breakfast-04.jpg': U('photo-1506084868230-bb9c99c24769'),

  'restaurant-01.jpg': U('photo-1555939594-58d7cb561241'),
  'restaurant-02.jpg': U('photo-1414235077428-338989a2e8c0'),
  'restaurant-03.jpg': U('photo-1504674900247-087087df9cc9'),
  'restaurant-04.jpg': U('photo-1476224207-aa6cedc4db29'),
}

async function main() {
  mkdirSync(OUT, { recursive: true })

  if (force) {
    for (const f of readdirSync(OUT)) {
      if (f.endsWith('.jpg')) unlinkSync(join(OUT, f))
    }
    console.log('Cleared existing food-images (--force)\n')
  }

  let ok = 0
  let skip = 0
  let fail = 0

  for (const [file, url] of Object.entries(ASSETS)) {
    const dest = join(OUT, file)
    if (!force && existsSync(dest)) {
      skip++
      continue
    }
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length < 8000) throw new Error('file too small')
      writeFileSync(dest, buf)
      ok++
      process.stdout.write(`✓ ${file}\n`)
    } catch (e) {
      fail++
      process.stderr.write(`✗ ${file}: ${e instanceof Error ? e.message : e}\n`)
    }
  }

  console.log(`\nDone: ${ok} downloaded, ${skip} skipped, ${fail} failed → ${OUT}`)
  if (fail > 0) console.warn(`\n⚠ ${fail} failed — run fill step below`)

  // Fill missing slots from first available file in each category
  const { copyFileSync } = await import('fs')
  const cats = [
    'bento', 'salmon', 'noodles', 'hotpot', 'salad', 'convenience', 'fried',
    'dessert', 'drink', 'fruit', 'snack', 'breakfast', 'restaurant',
  ]
  const fallback = join(OUT, 'salad-01.jpg')
  let filled = 0
  for (const cat of cats) {
    const existing = readdirSync(OUT).filter(f => f.startsWith(`${cat}-`) && f.endsWith('.jpg'))
    const anchor = existing.length
      ? join(OUT, existing.sort()[0]!)
      : existsSync(fallback)
        ? fallback
        : null
    if (!anchor) continue
    for (let i = 1; i <= 4; i++) {
      const name = `${cat}-${String(i).padStart(2, '0')}.jpg`
      const dest = join(OUT, name)
      if (!existsSync(dest)) {
        copyFileSync(anchor, dest)
        filled++
      }
    }
  }
  if (filled) console.log(`Filled ${filled} missing slots from category anchors`)
  if (fail > 0 && filled === 0) process.exit(1)
}

main()
