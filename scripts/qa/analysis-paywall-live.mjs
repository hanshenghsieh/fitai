import puppeteer from 'puppeteer'

const baseUrl = process.env.QA_BASE_URL || 'http://localhost:3010'
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const configuredSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

if (!serviceKey || !configuredSupabaseUrl) throw new Error('Missing Supabase QA environment')

const supabaseUrl = new URL(configuredSupabaseUrl).origin
const stamp = Date.now()
const email = `qa-analysis-paywall-${stamp}@betterbit.test`
const password = `Qa-${stamp}-Safe!`
let userId = null
let browser

function taipeiDateKey(offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * 86_400_000)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function displayDate(dateKey) {
  const [, month, day] = dateKey.split('-').map(Number)
  return `${month} 月 ${day} 日`
}

async function replaceInput(page, selector, value) {
  await page.waitForSelector(selector, { visible: true })
  await page.$eval(selector, input => {
    input.value = ''
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.type(selector, String(value))
}

async function clickButton(page, text) {
  const clicked = await page.evaluate(expected => {
    const button = [...document.querySelectorAll('button')].find(
      item => item.textContent?.replace(/\s+/g, ' ').trim() === expected
    )
    button?.click()
    return Boolean(button)
  }, text)
  if (!clicked) throw new Error(`Button not found: ${text}`)
}

async function insertMeasurements(rows) {
  for (const row of rows) {
    const query = new URL(`${supabaseUrl}/rest/v1/daily_checkins`)
    query.searchParams.set('user_id', `eq.${row.user_id}`)
    query.searchParams.set('checkin_date', `eq.${row.measured_at}`)
    query.searchParams.set('select', 'notes')
    const existingResponse = await fetch(query, {
      headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
    })
    if (!existingResponse.ok) throw new Error(`Checkin fixture read failed: ${existingResponse.status}`)
    const existingRows = await existingResponse.json()
    let notes = {}
    try {
      notes = JSON.parse(existingRows[0]?.notes || '{}')
    } catch {
      notes = {}
    }
    const weightHistory = Array.isArray(notes.weight_history) ? notes.weight_history : []
    const payload = {
      user_id: row.user_id,
      checkin_date: row.measured_at,
      notes: JSON.stringify({
        ...notes,
        weight_history: [
          ...weightHistory,
          { logged_at: `${row.measured_at}T12:00:00.000Z`, weight_kg: row.weight_kg },
        ],
      }),
    }
    const response = await fetch(
      `${supabaseUrl}/rest/v1/daily_checkins?on_conflict=user_id,checkin_date`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(payload),
      }
    )
    if (!response.ok) {
      throw new Error(`Measurement setup failed: ${response.status} ${await response.text()}`)
    }
  }
}

async function checkLegalScroll(page, path, title) {
  if (new URL(page.url()).pathname !== path) throw new Error(`${title} route did not open`)
  await page.waitForSelector('[data-legal-scroll-region]')
  const initial = await page.$eval('[data-legal-scroll-region]', region => {
    const style = getComputedStyle(region)
    return {
      scrollTop: region.scrollTop,
      scrollHeight: region.scrollHeight,
      clientHeight: region.clientHeight,
      overflowY: style.overflowY,
      webkitOverflowScrolling: style.webkitOverflowScrolling,
      minHeight: style.minHeight,
    }
  })
  if (initial.scrollTop !== 0) throw new Error(`${title} did not open at top`)
  if (initial.scrollHeight <= initial.clientHeight) throw new Error(`${title} has no independent scroll range`)
  if (initial.overflowY !== 'auto') throw new Error(`${title} overflow-y is not auto`)

  await page.$eval('[data-legal-scroll-region]', region => {
    region.scrollTo({ top: region.scrollHeight, behavior: 'instant' })
  })
  await new Promise(resolve => setTimeout(resolve, 100))
  const bottom = await page.$eval('[data-legal-scroll-region]', region => ({
    scrollTop: region.scrollTop,
    maxScroll: region.scrollHeight - region.clientHeight,
    mainBottom: region.querySelector('.legal-page-main')?.getBoundingClientRect().bottom ?? null,
    regionBottom: region.getBoundingClientRect().bottom,
  }))
  if (Math.abs(bottom.scrollTop - bottom.maxScroll) > 2) throw new Error(`${title} did not reach bottom`)
  if (bottom.mainBottom == null || bottom.mainBottom > bottom.regionBottom + 2) {
    throw new Error(`${title} bottom content is obscured`)
  }
  return { ...initial, ...bottom }
}

try {
  browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  page.setDefaultNavigationTimeout(120_000)
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 })

  page.on('response', async response => {
    if (response.url().endsWith('/api/auth/register') && response.request().method() === 'POST') {
      try {
        const body = await response.json()
        if (typeof body.userId === 'string') userId = body.userId
      } catch {
        // Registration navigation will fail if the response was unusable.
      }
    }
  })

  await page.goto(`${baseUrl}/register`, { waitUntil: 'networkidle0' })
  await replaceInput(page, '#name', 'Analysis Paywall QA')
  await replaceInput(page, '#email', email)
  await replaceInput(page, '#password', password)
  await page.click('button[type="submit"]')
  await page.waitForFunction(() => location.pathname === '/onboarding')
  await replaceInput(page, '#age', 34)
  await replaceInput(page, '#height', 175)
  await replaceInput(page, '#weight', 70.8)
  await clickButton(page, '男')
  await clickButton(page, '下一步')
  await page.waitForFunction(() => document.body.innerText.includes('生活型態'))
  await clickButton(page, '中度每週運動 2–3 次')
  await clickButton(page, '下一步')
  await page.waitForFunction(() => document.body.innerText.includes('最後確認'))
  await page.$eval('input[type="checkbox"]', checkbox => checkbox.click())
  await clickButton(page, '開始我的計畫')
  await page.waitForFunction(() => location.pathname === '/dashboard', { timeout: 120_000 })
  if (!userId) throw new Error('Registration did not expose a user id')

  const expected = [
    { date: taipeiDateKey(-2), weight: 70.2 },
    { date: taipeiDateKey(-1), weight: 69.7 },
    { date: taipeiDateKey(0), weight: 69.4 },
  ]
  await insertMeasurements(
    expected.map(item => ({
      user_id: userId,
      measured_at: item.date,
      weight_kg: item.weight,
      body_fat_pct: 20,
    }))
  )

  await page.goto(`${baseUrl}/progress`, { waitUntil: 'networkidle0' })
  await page.waitForSelector('[data-analysis-point]')
  const tooltipChecks = []
  for (const item of expected) {
    const selector = `[data-analysis-point="${item.date}"]`
    await page.waitForSelector(selector)
    await page.click(selector)
    const tooltip = await page.$eval('[data-analysis-tooltip]', element => ({
      text: element.textContent?.replace(/\s+/g, ' ').trim() ?? '',
      left: element.getBoundingClientRect().left,
      right: element.getBoundingClientRect().right,
      viewport: window.innerWidth,
    }))
    if (!tooltip.text.includes(displayDate(item.date)) || !tooltip.text.includes(`${item.weight.toFixed(1)} kg`)) {
      throw new Error(`Incorrect tooltip for ${item.date}: ${tooltip.text}`)
    }
    if (tooltip.left < 0 || tooltip.right > tooltip.viewport) throw new Error(`Tooltip escaped viewport for ${item.date}`)
    tooltipChecks.push({ ...item, ...tooltip })
  }

  await page.click(`[data-analysis-point="${expected.at(-1).date}"]`)
  if (await page.$('[data-analysis-tooltip]')) throw new Error('Repeated point tap did not close tooltip')
  await page.click(`[data-analysis-point="${expected[1].date}"]`)
  await page.click('.v2-analysis-chart-head')
  if (await page.$('[data-analysis-tooltip]')) throw new Error('Outside chart tap did not close tooltip')

  const scrollCheck = await page.$eval('#app-scroll-root', root => {
    const before = root.scrollTop
    root.scrollTo({ top: Math.min(root.scrollHeight - root.clientHeight, before + 240), behavior: 'instant' })
    return {
      before,
      after: root.scrollTop,
      scrollRange: root.scrollHeight - root.clientHeight,
      chartTouchAction: getComputedStyle(document.querySelector('.v2-analysis-line-chart')).touchAction,
    }
  })
  if (scrollCheck.scrollRange > 0 && scrollCheck.after <= scrollCheck.before) {
    throw new Error('Analysis page did not scroll normally')
  }
  if (scrollCheck.chartTouchAction !== 'pan-y') throw new Error('Chart does not preserve vertical touch scrolling')

  await page.reload({ waitUntil: 'networkidle0' })
  await page.waitForSelector(`[data-analysis-point="${expected[0].date}"]`)
  await page.click(`[data-analysis-point="${expected[0].date}"]`)
  if (!(await page.$('[data-analysis-tooltip]'))) throw new Error('Tooltip failed after refresh')

  const applyIosViewport = () => {
    document.documentElement.classList.add('capacitor-ios')
    document.documentElement.style.setProperty('--app-safe-top', '59px')
    document.documentElement.style.setProperty('--app-safe-bottom', '34px')
  }
  await page.evaluateOnNewDocument(applyIosViewport)
  await page.evaluate(applyIosViewport)
  await page.goto(`${baseUrl}/settings/premium`, { waitUntil: 'networkidle0' })
  await page.waitForFunction(() => document.body.innerText.includes('月訂方案'))
  await page.evaluate(() => {
    const monthly = [...document.querySelectorAll('.v2-pricing-card')].find(card =>
      card.textContent?.includes('月訂方案')
    )
    monthly?.click()
  })

  await page.click('a[href="/terms"]')
  await page.waitForFunction(() => location.pathname === '/terms')
  const terms = await checkLegalScroll(page, '/terms', 'Terms')
  await clickButton(page, '← 設定')
  await page.waitForFunction(() => location.pathname === '/settings/premium')
  await page.waitForSelector('.v2-pricing-card--selected')
  const selectedAfterTerms = await page.$eval('.v2-pricing-card--selected', card => card.textContent ?? '')
  if (!selectedAfterTerms.includes('月訂方案')) throw new Error('Plan selection changed after Terms')

  await page.click('a[href="/privacy"]')
  await page.waitForFunction(() => location.pathname === '/privacy')
  const privacy = await checkLegalScroll(page, '/privacy', 'Privacy')
  await clickButton(page, '← 設定')
  await page.waitForFunction(() => location.pathname === '/settings/premium')
  await page.waitForSelector('.v2-pricing-card--selected')
  const selectedAfterPrivacy = await page.$eval('.v2-pricing-card--selected', card => card.textContent ?? '')
  if (!selectedAfterPrivacy.includes('月訂方案')) throw new Error('Plan selection changed after Privacy')

  console.log(JSON.stringify({
    viewport: { width: 390, height: 844, safeTop: 59, safeBottom: 34 },
    measurements: expected,
    tooltipChecks,
    scrollCheck,
    refreshTooltip: true,
    terms,
    privacy,
    selectedPlanAfterTerms: 'monthly',
    selectedPlanAfterPrivacy: 'monthly',
    cleanup: 'pending',
  }))
} finally {
  if (browser) await browser.close()
  if (userId) {
    const cleanup = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
    })
    if (!cleanup.ok) throw new Error(`Temporary account cleanup failed: ${cleanup.status}`)
    console.log(JSON.stringify({ cleanup: 'completed' }))
  }
}
