import puppeteer from 'puppeteer'

const BASE = process.env.QA_BASE_URL || 'https://fitai-taupe-sigma.vercel.app'
const EMAIL = '123@gmail.com'
const PASS = '00000000'

const results = []

function log(path, status, detail) {
  results.push({ path, status, detail })
  console.log(`[${status}] ${path}: ${detail}`)
}

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true })

  const consoleErrors = []
  const pageErrors = []
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('pageerror', err => pageErrors.push(err.message))

  try {
    // 1. Homepage
    await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 60000 })
    const homeTitle = await page.title()
    const homeText = await page.evaluate(() => document.body.innerText.slice(0, 500))
    if (homeText.includes("couldn't load") || homeText.includes('Reload')) {
      log('1. 首頁', 'FAIL', '顯示錯誤頁 This page could not load')
    } else {
      log('1. 首頁', 'PASS', `title=${homeTitle}, 有內容`)
    }

    // 2. Login
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2', timeout: 60000 })
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 15000 }).catch(() => null)
    const emailSel = 'input[type="email"]'
    const passSel = 'input[type="password"]'
    const hasLogin = await page.$(emailSel)
    if (!hasLogin) {
      log('2. 登入', 'FAIL', '找不到 email 輸入框')
    } else {
      await page.type(emailSel, EMAIL, { delay: 20 })
      await page.type(passSel, PASS, { delay: 20 })
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => null),
        page.click('button[type="submit"]'),
      ])
      await wait(2000)
      const afterLoginUrl = page.url()
      const afterLoginText = await page.evaluate(() => document.body.innerText.slice(0, 800))
      if (afterLoginUrl.includes('/login')) {
        log('2. 登入', 'FAIL', `仍停留在 login: ${afterLoginText.slice(0, 120)}`)
      } else if (afterLoginText.includes("couldn't load")) {
        log('2. 登入', 'FAIL', '登入後顯示錯誤頁')
      } else {
        log('2. 登入', 'PASS', `導向 ${afterLoginUrl}`)
      }
    }

    // 3b. 新版 UI 標記
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle2', timeout: 60000 })
    await wait(1500)
    const dashText = await page.evaluate(() => document.body.innerText)
    const hasNewUI = dashText.includes('今天想吃什麼') || dashText.includes('今天照常過')
    log('3b. Today OS UI', hasNewUI ? 'PASS' : 'FAIL', hasNewUI ? '找到搜尋優先 UI' : '未找到 OS 文案')

    // 3c. PWA icon (fetch — page.goto 會被 middleware 干擾)
    const iconOk = await page.evaluate(async (base) => {
      const res = await fetch(`${base}/icon.svg`)
      return res.ok
    }, BASE)
    log('3c. PWA icon', iconOk ? 'PASS' : 'FAIL', iconOk ? '/icon.svg OK' : 'icon 404')

    // 3-5 Dashboard / weekly
    for (const [name, path] of [
      ['4. 今日任務/dashboard', '/dashboard'],
      ['5. 本週/weekly', '/weekly'],
      ['8. 進度/progress', '/progress'],
      ['10. 設定/settings', '/settings'],
    ]) {
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle2', timeout: 60000 })
      await wait(1500)
      const url = page.url()
      const text = await page.evaluate(() => document.body.innerText)
      if (url.includes('/login')) {
        log(name, 'FAIL', '被導回登入頁')
      } else if (text.includes("couldn't load") || text.includes('Reload to try')) {
        log(name, 'FAIL', '頁面無法載入錯誤')
      } else if (text.length < 50) {
        log(name, 'WARN', `內容過少 (${text.length} chars)`)
      } else {
        log(name, 'PASS', `載入成功 ${text.slice(0, 80).replace(/\n/g, ' ')}...`)
      }
    }

    // 6. 骰子救援
    await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle2', timeout: 60000 })
    await wait(2000)
    const diceBtn = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll('button')]
      return buttons.find(b => /交給我/.test(b.innerText))?.innerText
    })
    if (diceBtn) {
      log('6. 骰子救援', 'PASS', `找到: ${diceBtn}`)
      const clicked = await page.evaluate(() => {
        const buttons = [...document.querySelectorAll('button')]
        const expand = buttons.find(b => /不知道/.test(b.innerText))
        if (expand) expand.click()
        return !!expand
      })
      await wait(500)
      if (clicked) {
        await page.evaluate(() => {
          const buttons = [...document.querySelectorAll('button')]
          const btn = buttons.find(b => /骰一個/.test(b.innerText))
          if (btn) btn.click()
        })
        await wait(3000)
        const hasPreview = await page.evaluate(() => /就這個/.test(document.body.innerText))
        log('6. 骰子救援-預覽', hasPreview ? 'PASS' : 'WARN', hasPreview ? '有預覽未自動記錄' : '無預覽')
      }
    } else {
      log('6. 骰子救援', 'WARN', '未找到按鈕')
    }

    // 7. 食物搜尋 + 自填
    const hasSearch = await page.evaluate(() => !!document.querySelector('input[aria-label="搜尋食物"]'))
    log('7. 食物搜尋', hasSearch ? 'PASS' : 'WARN', hasSearch ? '搜尋框存在' : '未找到')
    if (hasSearch) {
      await page.type('input[aria-label="搜尋食物"]', '阿嬤滷肉飯', { delay: 20 })
      await wait(1000)
      const hasFreeText = await page.evaluate(() => /菜單沒有也 OK/.test(document.body.innerText))
      log('7b. 自填食物', hasFreeText ? 'PASS' : 'WARN', hasFreeText ? '可記錄菜單外品項' : '未找到')
    }

    // 12. Refresh persistence
    const beforeRefresh = await page.evaluate(() => document.body.innerText.slice(0, 200))
    await page.reload({ waitUntil: 'networkidle2' })
    await wait(2000)
    const afterRefresh = await page.evaluate(() => document.body.innerText.slice(0, 200))
    const stillAuthed = !page.url().includes('/login')
    log('12. 重新整理', stillAuthed ? 'PASS' : 'FAIL', stillAuthed ? '仍保持登入' : '登入狀態遺失')

    // 13. Logout and login
    await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle2', timeout: 60000 })
    await wait(1000)
    const logoutClicked = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll('button, a')]
      const el = buttons.find(b => /登出|logout/i.test(b.innerText))
      if (el) { el.click(); return true }
      return false
    })
    if (logoutClicked) {
      await wait(3000)
      await page.goto(`${BASE}/login`, { waitUntil: 'networkidle2' })
      await wait(500)
      await page.type('input[type="email"]', EMAIL, { delay: 20 })
      await page.type('input[type="password"]', PASS, { delay: 20 })
      await page.click('button[type="submit"]')
      try {
        await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 20000 })
        log('13. 登出再登入', 'PASS', page.url())
      } catch {
        log('13. 登出再登入', 'WARN', `登入逾時: ${page.url()}`)
      }
    } else {
      log('13. 登出再登入', 'WARN', '找不到登出按鈕')
    }

    if (consoleErrors.length) {
      log('Console errors', 'WARN', consoleErrors.slice(0, 5).join(' | '))
    }
    if (pageErrors.length) {
      log('Page errors', 'FAIL', pageErrors.slice(0, 5).join(' | '))
    }
  } catch (err) {
    log('FATAL', 'FAIL', err.message)
  } finally {
    await browser.close()
  }

  console.log('\n--- JSON ---')
  console.log(JSON.stringify(results, null, 2))
}

main()
