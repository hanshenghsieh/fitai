/**
 * Phase 4 OS 全流程自檢 — 10 組測試帳號
 * 用法: node scripts/qa-os-e2e.mjs
 * 需先: node scripts/create-test-accounts.mjs
 */

import puppeteer from 'puppeteer'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const accountsFile = join(__dirname, 'test-accounts.json')

const BASE = process.env.QA_BASE_URL || 'https://fitai-taupe-sigma.vercel.app'
const PASSWORD = process.env.QA_TEST_PASSWORD || 'BetterBit2026!'

let accounts = []
if (existsSync(accountsFile)) {
  const data = JSON.parse(readFileSync(accountsFile, 'utf8'))
  accounts = data.accounts.filter(a => a.status === 'OK').map(a => a.email)
}

if (!accounts.length) {
  accounts = Array.from({ length: 10 }, (_, i) => `test${String(i + 1).padStart(2, '0')}@betterbit.test`)
}

const results = []

function log(account, step, status, detail) {
  const row = { account, step, status, detail }
  results.push(row)
  console.log(`[${status}] ${account} · ${step}: ${detail}`)
}

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function login(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 60000 })
  await page.waitForSelector('input[type="email"]', { timeout: 15000 })
  await page.evaluate(() => {
    document.querySelectorAll('input').forEach(i => { i.value = '' })
  })
  await page.type('input[type="email"]', email, { delay: 15 })
  await page.type('input[type="password"]', PASSWORD, { delay: 15 })
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => null),
    page.click('button[type="submit"]'),
  ])
  await wait(2000)
  return !page.url().includes('/login')
}

async function runAccount(browser, email, index) {
  const context = await browser.createBrowserContext()
  const page = await context.newPage()
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })

  const pageErrors = []
  page.on('pageerror', err => pageErrors.push(err.message))

  try {
    const authed = await login(page, email)
    if (!authed) {
      log(email, '登入', 'FAIL', page.url())
      return
    }
    log(email, '登入', 'PASS', '成功')

    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle2', timeout: 60000 })
    await wait(2000)
    const dashText = await page.evaluate(() => document.body.innerText)

    if (dashText.includes("couldn't load")) {
      log(email, 'Dashboard', 'FAIL', '錯誤頁')
      return
    }

    const hasOS = dashText.includes('今天吃了什麼') || dashText.includes('跟我說')
    log(email, 'Food Memory', hasOS ? 'PASS' : 'FAIL', hasOS ? 'Food Memory UI' : '未找到')

    const searchInput = await page.$('input[aria-label="搜尋食物"]')
    if (searchInput) {
      await searchInput.type('雞', { delay: 30 })
      await wait(1500)
      const clicked = await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('button')]
        const hit = buttons.find(b => b.innerText.includes('kcal') && b.innerText.includes('蛋白'))
        if (hit) { hit.click(); return hit.innerText.slice(0, 40) }
        return null
      })
      await wait(1500)
      const afterLog = await page.evaluate(() => document.body.innerText)
      const logged = afterLog.includes('今天記了') || afterLog.includes('好 choice') || afterLog.includes('今天照常過')
      log(email, '食物記錄', clicked && logged ? 'PASS' : clicked ? 'WARN' : 'FAIL', clicked ? `選了 ${clicked}` : '無搜尋結果')
    } else {
      log(email, '食物記錄', 'FAIL', '無搜尋框')
    }

    const noLifeModes = !dashText.includes('生活模式（點一下')
    log(email, '隱形事件', noLifeModes ? 'PASS' : 'WARN', noLifeModes ? '無手動生活模式' : '仍有模式按鈕')

    await page.goto(`${BASE}/weekly`, { waitUntil: 'networkidle2', timeout: 60000 })
    await wait(1500)
    const weeklyOk = !page.url().includes('/login') && (await page.evaluate(() => document.body.innerText.length)) > 80
    log(email, '本週', weeklyOk ? 'PASS' : 'FAIL', weeklyOk ? '載入' : '失敗')

    await page.goto(`${BASE}/progress`, { waitUntil: 'networkidle2', timeout: 60000 })
    await wait(1500)
    const progressOk = !page.url().includes('/login')
    log(email, '進度', progressOk ? 'PASS' : 'FAIL', progressOk ? '載入' : '失敗')

    await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle2', timeout: 60000 })
    await wait(1500)
    const settingsText = await page.evaluate(() => document.body.innerText)
    const hasShift = settingsText.includes('夜班') || settingsText.includes('輪班') || settingsText.includes('作息')
    log(email, '設定', hasShift ? 'PASS' : 'WARN', hasShift ? '含班表設定' : '載入但無班表文案')

    if (pageErrors.length) {
      log(email, 'Page errors', 'FAIL', pageErrors.slice(0, 2).join(' | '))
    } else {
      log(email, 'Page errors', 'PASS', '無')
    }
  } catch (err) {
    log(email, 'FATAL', 'FAIL', err.message)
  } finally {
    await page.close()
    await context.close()
  }
}

async function main() {
  console.log(`QA OS E2E — ${accounts.length} accounts @ ${BASE}\n`)
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  for (let i = 0; i < accounts.length; i++) {
    await runAccount(browser, accounts[i], i)
  }

  await browser.close()

  const pass = results.filter(r => r.status === 'PASS').length
  const fail = results.filter(r => r.status === 'FAIL').length
  const warn = results.filter(r => r.status === 'WARN').length
  console.log(`\n--- 摘要: PASS ${pass} · WARN ${warn} · FAIL ${fail} ---`)
  console.log(JSON.stringify(results, null, 2))
  process.exit(fail > 0 ? 1 : 0)
}

main()
