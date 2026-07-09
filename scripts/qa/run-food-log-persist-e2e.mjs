#!/usr/bin/env node
/**
 * Food log persistence E2E — login → PATCH checkin → tab switch → reload → verify.
 *
 * Usage:
 *   BB_E2E_EMAIL=you@example.com BB_E2E_PASSWORD=secret npm run qa:food-log-persist-e2e
 *   BB_E2E_BASE_URL=http://localhost:3000 npm run qa:food-log-persist-e2e
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import puppeteer from 'puppeteer'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '../..')

const BASE_URL = (process.env.BB_E2E_BASE_URL ?? 'https://betterbit.app').replace(/\/$/, '')
const EMAIL = process.env.BB_E2E_EMAIL ?? ''
const PASSWORD = process.env.BB_E2E_PASSWORD ?? ''
const HEADLESS = process.env.BB_E2E_HEADLESS !== 'false'

const TEST_FOOD_NAME = 'E2E 茶葉蛋'
const DECOY_FOOD_NAME = 'E2E 保留餐'
const TEST_LOG_ID = `e2e-food-${Date.now()}`
const DECOY_LOG_ID = `e2e-decoy-${Date.now()}`

function fail(msg) {
  console.error(`FAIL: ${msg}`)
  process.exit(1)
}

function pass(msg) {
  console.log(`OK: ${msg}`)
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function apiCheckin(page) {
  return page.evaluate(async () => {
    const res = await fetch('/api/checkin', { credentials: 'same-origin' })
    if (!res.ok) throw new Error(`GET /api/checkin ${res.status}`)
    return res.json()
  })
}

async function apiPatchCheckin(page, payload) {
  return page.evaluate(async body => {
    const res = await fetch('/api/checkin', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`PATCH /api/checkin ${res.status}`)
    return res.json()
  }, payload)
}

function foodLogsFromCheckin(json) {
  try {
    const notes = json?.checkin?.notes
    if (!notes) return []
    const meta = JSON.parse(notes)
    return meta?.user_memory?.food_logs_today ?? []
  } catch {
    return []
  }
}

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2', timeout: 60000 })
  await page.waitForSelector('#email')
  await page.type('#email', EMAIL, { delay: 20 })
  await page.type('#password', PASSWORD, { delay: 20 })
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
    page.click('button[type="submit"]'),
  ])
  if (!page.url().includes('/dashboard')) {
    fail(`login did not reach dashboard (at ${page.url()})`)
  }
  pass('logged in')
}

async function seedFoodLog(page) {
  const before = await apiCheckin(page)
  const existingLogs = foodLogsFromCheckin(before).filter(
    l => l.id !== TEST_LOG_ID && l.id !== DECOY_LOG_ID
  )
  const now = new Date().toISOString()
  const testLog = {
    id: TEST_LOG_ID,
    name: TEST_FOOD_NAME,
    calories: 80,
    protein_g: 7,
    logged_at: now,
    user_declared: true,
    source: 'search',
  }
  const decoyLog = {
    id: DECOY_LOG_ID,
    name: DECOY_FOOD_NAME,
    calories: 120,
    protein_g: 8,
    logged_at: now,
    user_declared: true,
    source: 'search',
  }
  const notes = JSON.stringify({
    user_memory: { food_logs_today: [...existingLogs, testLog, decoyLog] },
  })
  await apiPatchCheckin(page, {
    diet_items: before.checkin?.diet_items ?? [],
    workout_items: before.checkin?.workout_items ?? [],
    water_ml: before.checkin?.water_ml ?? 0,
    notes,
  })
  const after = await apiCheckin(page)
  const logs = foodLogsFromCheckin(after)
  if (!logs.some(l => l.id === TEST_LOG_ID) || !logs.some(l => l.id === DECOY_LOG_ID)) {
    fail('PATCH did not persist test food logs')
  }
  pass('seeded two food logs via PATCH')
}

async function verifySessionCache(page, step) {
  const cache = await page.evaluate(() => {
    const key = Object.keys(sessionStorage).find(k => k.startsWith('bb_food_logs_'))
    if (!key) return null
    try {
      return JSON.parse(sessionStorage.getItem(key) ?? '[]')
    } catch {
      return null
    }
  })
  if (!Array.isArray(cache) || !cache.some(l => l.id === TEST_LOG_ID)) {
    console.warn(`WARN: ${step}: sessionStorage missing test log (API-only seed may skip client cache)`)
    return
  }
  pass(`${step}: session cache has test log`)
}

async function verifyDurableCache(page, step) {
  const snap = await page.evaluate(() => {
    try {
      const raw = localStorage.getItem('bb_today_offline_v1')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })
  if (!snap?.food_logs_today?.some(l => l.id === TEST_LOG_ID)) {
    console.warn(`WARN: ${step}: durable offline cache not yet populated (needs Phase A deploy)`)
    return
  }
  pass(`${step}: durable offline cache has test log`)
}

async function verifyOnDashboard(page, step) {
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2', timeout: 60000 })
  await sleep(1500)
  const apiLogs = foodLogsFromCheckin(await apiCheckin(page))
  if (!apiLogs.some(l => l.id === TEST_LOG_ID)) {
    fail(`${step}: API missing test log after dashboard load`)
  }
  const bodyText = await page.evaluate(() => document.body.innerText)
  if (!bodyText.includes(TEST_FOOD_NAME) && !bodyText.includes('茶葉蛋')) {
    fail(`${step}: dashboard UI missing food log text`)
  }
  pass(`${step}: dashboard shows persisted log`)
}

async function tabSwitch(page) {
  await page.click('a[href="/progress"]')
  await sleep(1200)
  await page.click('a[href="/dashboard"]')
  await sleep(1500)
  pass('switched progress → dashboard tabs')
}

async function simulateClientDelete(page) {
  const current = await apiCheckin(page)
  const logs = foodLogsFromCheckin(current).filter(l => l.id !== TEST_LOG_ID)
  if (!logs.some(l => l.id === DECOY_LOG_ID)) {
    fail('delete simulation: decoy log missing before delete')
  }
  let notesObj = {}
  try {
    notesObj = current.checkin?.notes ? JSON.parse(current.checkin.notes) : {}
  } catch {
    notesObj = {}
  }
  notesObj = {
    ...notesObj,
    user_memory: { ...(notesObj.user_memory ?? {}), food_logs_today: logs },
  }
  await apiPatchCheckin(page, {
    diet_items: current.checkin?.diet_items ?? [],
    workout_items: current.checkin?.workout_items ?? [],
    water_ml: current.checkin?.water_ml ?? 0,
    notes: JSON.stringify(notesObj),
  })
  await page.evaluate(
    ({ logs, decoyId }) => {
      const day = new Date().toISOString().slice(0, 10)
      sessionStorage.setItem(`bb_food_logs_${day}`, JSON.stringify(logs))
      localStorage.setItem(
        'bb_today_offline_v1',
        JSON.stringify({
          date: day,
          food_logs_today: logs,
          updated_at: new Date().toISOString(),
        })
      )
      return logs.some(l => l.id === decoyId)
    },
    { logs, decoyId: DECOY_LOG_ID }
  )
  pass('simulated client delete (PATCH + session + durable cache)')
}

async function verifyDeletedAfterNavigation(page, step) {
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'networkidle2', timeout: 60000 })
  await sleep(1500)
  const apiLogs = foodLogsFromCheckin(await apiCheckin(page))
  if (apiLogs.some(l => l.id === TEST_LOG_ID)) {
    fail(`${step}: deleted log still in API`)
  }
  if (!apiLogs.some(l => l.id === DECOY_LOG_ID)) {
    fail(`${step}: decoy log missing from API after delete`)
  }
  const bodyText = await page.evaluate(() => document.body.innerText)
  if (bodyText.includes(TEST_FOOD_NAME)) {
    fail(`${step}: deleted food still visible in UI`)
  }
  pass(`${step}: deleted log stays gone after navigation`)
}

async function cleanup(page) {
  const current = await apiCheckin(page)
  const logs = foodLogsFromCheckin(current).filter(
    l => l.id !== TEST_LOG_ID && l.id !== DECOY_LOG_ID
  )
  let notesObj = {}
  try {
    notesObj = current.checkin?.notes ? JSON.parse(current.checkin.notes) : {}
  } catch {
    notesObj = {}
  }
  notesObj = {
    ...notesObj,
    user_memory: { ...(notesObj.user_memory ?? {}), food_logs_today: logs },
  }
  await apiPatchCheckin(page, {
    diet_items: current.checkin?.diet_items ?? [],
    workout_items: current.checkin?.workout_items ?? [],
    water_ml: current.checkin?.water_ml ?? 0,
    notes: JSON.stringify(notesObj),
  })
  pass('cleaned up test log')
}

async function main() {
  if (!EMAIL || !PASSWORD) {
    fail('set BB_E2E_EMAIL and BB_E2E_PASSWORD')
  }

  const browser = await puppeteer.launch({
    headless: HEADLESS,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  const page = await browser.newPage()
  page.setDefaultTimeout(60000)

  const report = {
    at: new Date().toISOString(),
    baseUrl: BASE_URL,
    steps: [],
  }

  try {
    await login(page)
    report.steps.push('login')

    await seedFoodLog(page)
    report.steps.push('seed')

    await verifyOnDashboard(page, 'after seed')
    await verifySessionCache(page, 'after seed')
    await verifyDurableCache(page, 'after seed')
    report.steps.push('verify_seed')

    await tabSwitch(page)
    report.steps.push('tab_switch')

    await verifyOnDashboard(page, 'after tab switch')
    await verifySessionCache(page, 'after tab switch')
    report.steps.push('verify_tab')

    await page.reload({ waitUntil: 'networkidle2' })
    await sleep(1500)
    report.steps.push('reload')

    await verifyOnDashboard(page, 'after reload')
    report.steps.push('verify_reload')

    await simulateClientDelete(page)
    report.steps.push('delete')

    await tabSwitch(page)
    report.steps.push('tab_switch_after_delete')

    await verifyDeletedAfterNavigation(page, 'after delete + tab switch')
    report.steps.push('verify_delete_persist')

    await page.reload({ waitUntil: 'networkidle2' })
    await sleep(1500)
    await verifyDeletedAfterNavigation(page, 'after delete + reload')
    report.steps.push('verify_delete_reload')

    await cleanup(page)
    report.steps.push('cleanup')

    const outPath = path.join(ROOT, 'docs/FOOD_LOG_PERSIST_E2E_REPORT.md')
    fs.writeFileSync(
      outPath,
      `# Food Log Persist E2E Report

Generated: ${report.at}
Base URL: ${report.baseUrl}

## Result

**PASS** — all ${report.steps.length} steps completed (add, tab switch, reload, **delete**, tab switch after delete).

## Steps

${report.steps.map(s => `- ${s}`).join('\n')}

## Manual mobile follow-up

Run the same flow on Capacitor iOS using \`docs/FOOD_LOG_PERSIST_MOBILE_E2E.md\`.
`,
      'utf8'
    )
    console.log(`\nReport: ${outPath}`)
    pass('food log persist E2E complete')
  } catch (err) {
    console.error(err)
    fail(err instanceof Error ? err.message : String(err))
  } finally {
    await browser.close()
  }
}

main()
