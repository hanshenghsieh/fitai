import puppeteer from 'puppeteer'

const baseUrl = process.env.QA_BASE_URL || 'http://localhost:3010'
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const configuredSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

if (!serviceKey || !configuredSupabaseUrl) {
  throw new Error('Missing Supabase QA environment')
}

const supabaseUrl = new URL(configuredSupabaseUrl).origin
const stamp = Date.now()
const email = `qa-reg-bootstrap-${stamp}@betterbit.test`
const password = `Qa-${stamp}-Safe!`
const input = {
  gender: 'male',
  age: 34,
  heightCm: 178,
  weightKg: 82,
  activityLevel: 'moderate',
  goalType: 'lose_fat',
  goalMonths: 3,
}

let userId = null
let browser
let page
let transitionPoll
const transitionErrors = []
const geometry = []
const blockingErrors = []
let recordDateAcceptance = null
let uxRecCbankAcceptance = null

async function adminJson(path) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
    },
  })
  if (!response.ok) throw new Error(`QA verification request failed: ${response.status}`)
  return response.json()
}

async function replaceTodayFoodLogs(userId, date, logs) {
  const rows = await adminJson(
    `daily_checkins?user_id=eq.${userId}&checkin_date=eq.${date}&select=id,notes`
  )
  if (rows.length !== 1) throw new Error('QA checkin row missing for nutrition scenario')
  let notes = {}
  try {
    notes = JSON.parse(rows[0].notes || '{}')
  } catch {
    notes = {}
  }
  const nextNotes = {
    ...notes,
    user_memory: {
      ...(notes.user_memory ?? {}),
      food_logs_today: logs,
    },
  }
  const response = await fetch(
    `${supabaseUrl}/rest/v1/daily_checkins?id=eq.${rows[0].id}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ notes: JSON.stringify(nextNotes) }),
    }
  )
  if (!response.ok) throw new Error(`QA checkin update failed: ${response.status}`)
}

async function clearTodayFoodCaches(page, date) {
  await page.evaluate(dateKey => {
    sessionStorage.removeItem(`bb_food_logs_${dateKey}`)
    sessionStorage.removeItem('betterbit:record-date-trace')
    localStorage.removeItem('bb_today_offline_v1')
    localStorage.removeItem('bb_offline_mutations_v1')
    localStorage.removeItem('bb_pending_sync_v1')
  }, date)
}

function taipeiDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei' }).format(date)
}

function previousDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return taipeiDateKey(new Date(Date.UTC(year, month - 1, day - 1, 12)))
}

function foodLogsFromRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return []
  try {
    return JSON.parse(rows[0].notes || '{}')?.user_memory?.food_logs_today ?? []
  } catch {
    return []
  }
}

async function waitForPersistedLog(userId, date, name) {
  const query = `daily_checkins?user_id=eq.${userId}&checkin_date=eq.${date}&select=checkin_date,notes`
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    const rows = await adminJson(query)
    const logs = foodLogsFromRows(rows)
    const match = logs.find(log => log.name === name || log.display_label === name)
    if (match) return { logs, match, checkinDate: rows[0]?.checkin_date ?? null }
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  throw new Error(`Food log did not persist for ${date}: ${name}`)
}

async function clickButton(page, text) {
  const normalizedExpected = text.replace(/\s+/g, ' ').trim()
  const clicked = await page.evaluate(expected => {
    const button = [...document.querySelectorAll('button')].find(
      item => item.textContent?.replace(/\s+/g, ' ').trim() === expected
    )
    button?.click()
    return Boolean(button)
  }, normalizedExpected)
  if (clicked) return
  throw new Error(`Button not found: ${text}`)
}

async function clickButtonContaining(page, text) {
  const clicked = await page.evaluate(expected => {
    const button = [...document.querySelectorAll('button')].find(item =>
      item.textContent?.replace(/\s+/g, ' ').trim().includes(expected)
    )
    button?.click()
    return Boolean(button)
  }, text)
  if (clicked) return
  throw new Error(`Button containing text not found: ${text}`)
}

async function replaceInput(page, selector, value) {
  await page.waitForSelector(selector, { visible: true })
  await page.$eval(selector, inputElement => {
    inputElement.value = ''
    inputElement.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.type(selector, String(value))
}

async function measureTabGeometry(page, path) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle0' })
  await page.waitForSelector('.app-tab-header')
  await page.waitForSelector('.app-bottom-nav--v2')
  await page.evaluate(() => {
    document.documentElement.classList.add('capacitor-ios')
    document.documentElement.style.setProperty('--app-safe-top', '59px')
    document.documentElement.style.setProperty('--app-safe-bottom', '34px')
  })
  const read = () =>
    page.evaluate(() => {
      const rect = selector => document.querySelector(selector)?.getBoundingClientRect()
      const header = rect('.app-tab-header')
      const nav = rect('.app-bottom-nav--v2')
      const navRow = rect('.app-bottom-nav__row')
      const content = document.querySelector('.app-tab-page-content')
      const scroll = document.querySelector('#app-scroll-root')
      return {
        path: window.location.pathname,
        headerHeight: header?.height ?? null,
        headerTop: header?.top ?? null,
        navHeight: nav?.height ?? null,
        navRowHeight: navRow?.height ?? null,
        navBottomGap: nav ? window.innerHeight - nav.bottom : null,
        contentBottomPadding: content
          ? Number.parseFloat(getComputedStyle(content).paddingBottom)
          : null,
        scrollBottomPadding: scroll
          ? Number.parseFloat(getComputedStyle(scroll).paddingBottom)
          : null,
        horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      }
    })
  const first = await read()
  await new Promise(resolve => setTimeout(resolve, 250))
  const second = await read()
  if (JSON.stringify(first) !== JSON.stringify(second)) {
    throw new Error(`Layout jump detected on ${path}`)
  }
  const screenshot = await page.screenshot({ encoding: 'binary' })
  if (!screenshot.byteLength) throw new Error(`Empty viewport capture on ${path}`)
  return first
}

try {
  browser = await puppeteer.launch({ headless: true })
  page = await browser.newPage()
  page.setDefaultNavigationTimeout(120_000)
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 })

  page.on('pageerror', error => {
    if (error.message.includes("Cannot read properties of null (reading 'innerText')")) return
    blockingErrors.push(`page:${error.message}`)
  })
  page.on('requestfailed', request => {
    const url = request.url()
    if (url.includes('/auth/v1/logout') && request.failure()?.errorText === 'net::ERR_ABORTED') {
      return
    }
    if (url.includes('supabase.co') || url.includes('/api/')) {
      blockingErrors.push(`network:${new URL(url).pathname}:${request.failure()?.errorText}`)
    }
  })
  page.on('response', async response => {
    const url = response.url()
    if (url.endsWith('/api/auth/register') && response.request().method() === 'POST') {
      try {
        const body = await response.json()
        if (typeof body.userId === 'string') userId = body.userId
      } catch {
        // The flow itself will fail if registration did not return JSON.
      }
    }
    if (url.includes('/api/') && response.status() >= 400) {
      blockingErrors.push(`http:${response.status()}:${new URL(url).pathname}`)
    }
    if (url.includes('supabase.co') && response.status() >= 400) {
      blockingErrors.push(`supabase:${response.status()}:${new URL(url).pathname}`)
    }
  })

  await page.goto(`${baseUrl}/register`, { waitUntil: 'networkidle0' })
  await replaceInput(page, '#name', 'Bootstrap QA')
  await replaceInput(page, '#email', email)
  await replaceInput(page, '#password', password)
  await page.click('button[type="submit"]')
  await page.waitForFunction(() => window.location.pathname === '/onboarding', {
    timeout: 30_000,
  })

  await replaceInput(page, '#age', input.age)
  await replaceInput(page, '#height', input.heightCm)
  await replaceInput(page, '#weight', input.weightKg)
  await clickButton(page, '男')
  await clickButton(page, '下一步')
  await page.waitForFunction(() => document.body.innerText.includes('生活型態'))
  await clickButton(page, '中度每週運動 2–3 次')
  await clickButton(page, '下一步')
  await page.waitForFunction(() => document.body.innerText.includes('最後確認'))
  await page.$eval('input[type="checkbox"]', checkbox => checkbox.click())

  const previewText = await page.locator('body').map(element => element.innerText).wait()
  const expectedMatch = previewText.match(/每日熱量\s*([\d,]+)\s*kcal/)
  const expectedCalories = expectedMatch ? Number(expectedMatch[1].replace(/,/g, '')) : null
  if (!expectedCalories) throw new Error('Calculated calorie preview was not visible')

  await page.waitForFunction(() => {
    const button = [...document.querySelectorAll('button')].find(item =>
      item.textContent?.includes('開始我的計畫')
    )
    const checkbox = document.querySelector('input[type="checkbox"]')
    return checkbox?.checked && button && !button.disabled
  })
  transitionPoll = setInterval(async () => {
    try {
      const text = await page.evaluate(() => document.body?.innerText ?? '')
      const match = text.match(/找不到|404。|錯誤：/)
      if (match) transitionErrors.push(match[0])
    } catch {
      // Navigation temporarily replaces the execution context.
    }
  }, 100)
  await clickButton(page, '開始我的計畫')
  await page.waitForFunction(() => window.location.pathname === '/dashboard', {
    timeout: 120_000,
  })
  clearInterval(transitionPoll)
  await page.waitForFunction(() => document.body?.innerText.includes('每日預算'), {
    timeout: 30_000,
  })

  if (!userId) throw new Error('Registration response did not expose a user id')
  const [profiles, goals, plans] = await Promise.all([
    adminJson(`user_profiles?id=eq.${userId}&select=*`),
    adminJson(`goals?user_id=eq.${userId}&is_active=eq.true&select=*`),
    adminJson(
      `weekly_plans?user_id=eq.${userId}&generation_status=eq.completed&select=plan_data,generation_status`
    ),
  ])
  const todayKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
  const todayPlan = plans[0]?.plan_data?.days?.find(day => day.date === todayKey)
  const actualCalories = todayPlan?.daily_targets?.calories ?? null
  const exerciseAdjustment = todayPlan?.daily_targets?.intake_adjustment_kcal ?? 0
  const expectedTodayCalories = expectedCalories + exerciseAdjustment
  const dashboardText = await page.locator('body').map(element => element.innerText).wait()

  if (actualCalories !== expectedTodayCalories) {
    throw new Error(
      `Calorie target mismatch: expected ${expectedTodayCalories}, actual ${actualCalories}`
    )
  }
  const displayedTargetMatch = dashboardText.match(/每日預算\s*([\d,]+)\s*kcal/)
  const displayedTarget = Number(displayedTargetMatch?.[1]?.replaceAll(',', ''))
  if (!Number.isFinite(displayedTarget) || displayedTarget <= 0 || displayedTarget === 2000) {
    throw new Error('Today did not render a personalized calorie target')
  }
  if (
    profiles.length !== 1 ||
    profiles[0].onboarding_completed !== true ||
    goals.length !== 1 ||
    plans.length !== 1
  ) {
    throw new Error('Bootstrap rows were missing or duplicated')
  }
  if (transitionErrors.length) throw new Error('Not-found UI appeared during bootstrap')

  await page.reload({ waitUntil: 'networkidle0' })
  await page.waitForFunction(() => {
    const match = document.body.innerText.match(/每日預算\s*([\d,]+)\s*kcal/)
    const target = Number(match?.[1]?.replaceAll(',', ''))
    return Number.isFinite(target) && target > 0 && target !== 2000
  })
  const refreshPersisted = true

  const historicalMealName = `RECORD_DATE_TEST_${stamp}`
  const todayMealName = `RECORD_DATE_GLOBAL_${stamp}`

  await page.goto(`${baseUrl}/weekly`, { waitUntil: 'networkidle0' })
  await page.waitForSelector('button[aria-label="前一天"]')
  const recordTodayDate = await page.$eval('input[type="date"]', input => input.value)
  const historicalDate = previousDateKey(recordTodayDate)
  await page.click('button[aria-label="前一天"]')
  await page.waitForFunction(
    date => document.querySelector('input[type="date"]')?.value === date,
    {},
    historicalDate
  )
  await new Promise(resolve => setTimeout(resolve, 350))
  await clickButton(page, '+ 新增早餐')
  await page.waitForFunction(() => window.location.pathname === '/dashboard')
  await page.waitForSelector('[data-target-date]')
  const sheetContext = await page.$eval(
    '[data-target-date]',
    element => ({
      targetDate: element.getAttribute('data-target-date'),
      targetSlot: element.getAttribute('data-target-slot'),
      targetMealSlot: element.getAttribute('data-target-meal-slot'),
    })
  )
  if (
    sheetContext.targetDate !== historicalDate ||
    sheetContext.targetSlot !== 'meal1' ||
    sheetContext.targetMealSlot !== 'breakfast'
  ) {
    throw new Error(`Record sheet context mismatch: ${JSON.stringify(sheetContext)}`)
  }
  await page.evaluate(() => {
    const sheet = document.querySelector('[data-target-meal-slot="breakfast"]')
    const button = [...(sheet?.querySelectorAll('button') ?? [])].find(
      element => element.textContent?.includes('拍照記錄')
    )
    if (!(button instanceof HTMLButtonElement)) throw new Error('Historical photo action missing')
    button.click()
  })
  await page.waitForFunction(
    () => document.body.innerText.includes('從相簿選擇')
  )
  const historicalPhotoTargetDate = await page.$$eval(
    '[data-target-date]',
    elements => elements.find(element => element.textContent?.includes('從相簿選擇'))
      ?.getAttribute('data-target-date')
  )
  if (historicalPhotoTargetDate !== historicalDate) {
    throw new Error(`Photo sheet context mismatch: ${historicalPhotoTargetDate}`)
  }
  await page.click('button[aria-label="關閉"]')
  await page.goto(
    `${baseUrl}/dashboard?record=1&targetDate=${historicalDate}&targetMealSlot=breakfast`,
    { waitUntil: 'networkidle0' }
  )
  await page.waitForSelector(
    `[data-target-date="${historicalDate}"][data-target-meal-slot="breakfast"]`
  )
  await clickButtonContaining(page, '搜尋或輸入餐點名稱')
  await page.waitForSelector('input[placeholder^="例如："]')
  const textTargetDate = await page.$eval(
    '[data-target-date] input[placeholder^="例如："]',
    input => input.closest('[data-target-date]')?.getAttribute('data-target-date')
  )
  if (textTargetDate !== historicalDate) {
    throw new Error(`Text sheet context mismatch: ${textTargetDate}`)
  }
  await replaceInput(page, 'input[placeholder^="例如："]', historicalMealName)
  await page.waitForFunction(
    value => document.body.innerText.includes(`找不到「${value}」`),
    {},
    historicalMealName
  )
  await clickButton(page, '建立估算餐點')
  await clickButton(page, '下一步')
  await page.waitForFunction(() => document.body?.innerText.includes('加入所選日期紀錄'))
  await new Promise(resolve => setTimeout(resolve, 350))
  await clickButton(page, '加入所選日期紀錄')

  const historicalPersisted = await waitForPersistedLog(
    userId,
    historicalDate,
    historicalMealName
  )
  const historicalStoredLocalDate = taipeiDateKey(new Date(historicalPersisted.match.logged_at))
  if (
    historicalPersisted.checkinDate !== historicalDate ||
    historicalStoredLocalDate !== historicalDate ||
    historicalPersisted.match.slot !== 'meal1'
  ) {
    throw new Error(`Historical persisted row mismatch: ${JSON.stringify({
      checkinDate: historicalPersisted.checkinDate,
      loggedAt: historicalPersisted.match.logged_at,
      storedLocalDate: historicalStoredLocalDate,
      slot: historicalPersisted.match.slot,
      id: historicalPersisted.match.id,
    })}`)
  }
  const todayBeforeGlobal = foodLogsFromRows(
    await adminJson(`daily_checkins?user_id=eq.${userId}&checkin_date=eq.${recordTodayDate}&select=notes`)
  )
  if (todayBeforeGlobal.some(log => log.name === historicalMealName)) {
    throw new Error('Historical meal leaked into Today')
  }

  await page.goto(`${baseUrl}/weekly`, { waitUntil: 'networkidle0' })
  await page.waitForFunction(
    name => document.body.innerText.includes(name),
    { timeout: 30_000 },
    historicalMealName
  )
  await page.reload({ waitUntil: 'networkidle0' })
  await page.waitForFunction(
    name => document.body.innerText.includes(name),
    { timeout: 30_000 },
    historicalMealName
  )
  await clickButton(page, '+ 新增早餐')
  await page.waitForFunction(() => window.location.pathname === '/dashboard')
  await page.waitForSelector(
    `[data-target-date="${historicalDate}"][data-target-meal-slot="breakfast"]`
  )
  await clickButtonContaining(page, '搜尋或輸入餐點名稱')
  await replaceInput(page, 'input[placeholder^="例如："]', '雞胸肉')
  await page.waitForFunction(() =>
    [...document.querySelectorAll('button')].some(button =>
      button.textContent?.trim().startsWith('雞胸肉')
    )
  )
  await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find(item =>
      item.textContent?.trim().startsWith('雞胸肉')
    )
    if (!(button instanceof HTMLButtonElement)) throw new Error('P0 historical result missing')
    button.click()
  })
  await page.waitForFunction(() => document.body.innerText.includes('加入所選日期紀錄'))
  await clickButton(page, '加入所選日期紀錄')
  const p0HistoricalPersisted = await waitForPersistedLog(userId, historicalDate, '雞胸肉')
  const p0StoredLocalDate = taipeiDateKey(new Date(p0HistoricalPersisted.match.logged_at))
  if (
    p0HistoricalPersisted.checkinDate !== historicalDate ||
    p0StoredLocalDate !== historicalDate ||
    p0HistoricalPersisted.match.slot !== 'meal1'
  ) {
    throw new Error(`P0 historical persisted row mismatch: ${JSON.stringify({
      checkinDate: p0HistoricalPersisted.checkinDate,
      loggedAt: p0HistoricalPersisted.match.logged_at,
      storedLocalDate: p0StoredLocalDate,
      slot: p0HistoricalPersisted.match.slot,
      id: p0HistoricalPersisted.match.id,
    })}`)
  }
  const todayAfterP0 = foodLogsFromRows(
    await adminJson(`daily_checkins?user_id=eq.${userId}&checkin_date=eq.${recordTodayDate}&select=notes`)
  )
  if (todayAfterP0.some(log => log.id === p0HistoricalPersisted.match.id)) {
    throw new Error('Historical P0 meal leaked into Today')
  }
  const recordDateTrace = await page.evaluate(() => window.__recordDateTrace ?? [])

  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle0' })
  await page.click('button[aria-label="拍照記錄"]')
  await clickButtonContaining(page, '搜尋或輸入餐點名稱')
  await replaceInput(page, 'input[placeholder^="例如："]', todayMealName)
  await page.waitForFunction(
    value => document.body.innerText.includes(`找不到「${value}」`),
    {},
    todayMealName
  )
  await clickButton(page, '建立估算餐點')
  await clickButton(page, '下一步')
  await page.waitForFunction(() => document.body?.innerText.includes('加入今日紀錄'))
  await new Promise(resolve => setTimeout(resolve, 350))
  await clickButton(page, '加入今日紀錄')
  const todayPersisted = await waitForPersistedLog(userId, recordTodayDate, todayMealName)
  if (historicalPersisted.logs.some(log => log.name === todayMealName)) {
    throw new Error('Global FAB reused the historical targetDate')
  }
  recordDateAcceptance = {
    historicalDate,
    historicalFoodLogId: historicalPersisted.match.id,
    historicalStoredLoggedAt: historicalPersisted.match.logged_at,
    historicalStoredLocalDate,
    historicalStoredCheckinDate: historicalPersisted.checkinDate,
    historicalMealSlot: historicalPersisted.match.slot,
    p0HistoricalFoodLogId: p0HistoricalPersisted.match.id,
    p0HistoricalStoredLoggedAt: p0HistoricalPersisted.match.logged_at,
    p0HistoricalStoredLocalDate: p0StoredLocalDate,
    p0HistoricalStoredCheckinDate: p0HistoricalPersisted.checkinDate,
    p0HistoricalMealSlot: p0HistoricalPersisted.match.slot,
    historicalPhotoTargetDate,
    pendingConfirmationContract: 'same captureTargetDate',
    historicalPersistedAfterRefresh: true,
    historicalAbsentFromToday: true,
    globalFabDate: recordTodayDate,
    globalFabMealSlot: todayPersisted.match.slot,
    trace: recordDateTrace.filter(entry =>
      entry.foodLogId === historicalPersisted.match.id ||
      entry.targetDate === historicalDate ||
      entry.selectedDate === historicalDate
    ),
  }

  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle0' })
  await page.evaluate(() => {
    const dismiss = [...document.querySelectorAll('button')].find(
      button => button.textContent?.trim() === '好'
    )
    dismiss?.click()
  })
  await new Promise(resolve => setTimeout(resolve, 250))
  await page.waitForSelector('[data-reorder-item]')
  const mealChip = await page.$('[data-reorder-item]')
  await mealChip?.evaluate(element => element.scrollIntoView({ block: 'center' }))
  await new Promise(resolve => setTimeout(resolve, 150))
  const chipBox = await mealChip?.boundingBox()
  if (!chipBox) throw new Error('Meal chip missing for long-press acceptance')
  const chipX = chipBox.x + chipBox.width / 2
  const chipY = chipBox.y + chipBox.height / 2

  await page.mouse.move(chipX, chipY)
  await page.mouse.down()
  await page.mouse.move(chipX, chipY + 20, { steps: 3 })
  await new Promise(resolve => setTimeout(resolve, 900))
  await page.mouse.up()
  if (await page.$('button[aria-label="刪除餐點"]')) {
    throw new Error('Meal long press triggered while pointer was scrolling')
  }

  await page.mouse.move(chipX, chipY)
  await page.mouse.down()
  await new Promise(resolve => setTimeout(resolve, 500))
  if (await page.$('button[aria-label="刪除餐點"]')) {
    throw new Error('Meal long press triggered before 800ms')
  }
  await new Promise(resolve => setTimeout(resolve, 350))
  await page.waitForSelector('button[aria-label="刪除餐點"]')
  await page.mouse.up()
  await page.click('button[aria-label="取消移動"]')

  const proteinTarget = todayPlan.daily_targets.protein_g
  const fatTarget = todayPlan.daily_targets.fat_g
  const carbsTarget = todayPlan.daily_targets.carbs_g
  const recommendationLog = {
    id: `UX-REC-${stamp}`,
    name: 'UX recommendation context',
    calories: actualCalories - 411,
    protein_g: Math.max(1, proteinTarget - 72),
    fat_g: fatTarget + 2,
    carbs_g: Math.max(1, carbsTarget - 50),
    slot: 'meal2',
    logged_at: new Date().toISOString(),
    user_declared: true,
    source: 'search',
    nutrition_status: 'confirmed',
  }
  let liveRemainingCalories = null
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await clearTodayFoodCaches(page, recordTodayDate)
    await page.goto('about:blank')
    await replaceTodayFoodLogs(userId, recordTodayDate, [recommendationLog])
    await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle0' })
    liveRemainingCalories = await page.evaluate(() => {
      const match = document.body.innerText.match(/剩餘可吃\s*([\d,]+)\s*kcal/)
      return Number(match?.[1]?.replaceAll(',', ''))
    })
    if (liveRemainingCalories === 402) break
    recommendationLog.calories += liveRemainingCalories - 402
  }
  if (liveRemainingCalories !== 402) {
    throw new Error(`Unable to establish 402 kcal live recommendation context: ${liveRemainingCalories}`)
  }
  await clickButton(page, '幫我推薦下一餐')
  await new Promise(resolve => setTimeout(resolve, 1200))
  const recommendationText = await page.evaluate(() => {
    const heading = [...document.querySelectorAll('h2')].find(
      element => element.textContent?.trim() === '餐點推薦'
    )
    return heading?.parentElement?.parentElement?.innerText ?? ''
  })
  if (/滷雞腿|滷肉飯|昆布鍋/.test(recommendationText)) {
    throw new Error(`Unsafe recommendation remained: ${recommendationText}`)
  }
  const recommendationCalories = [...recommendationText.matchAll(/約?\s*([\d,]+)\s*kcal/g)]
    .map(match => Number(match[1].replaceAll(',', '')))
    .filter(Number.isFinite)
  if (recommendationCalories.some(calories => calories > 402)) {
    throw new Error(`Recommendation exceeded 402 kcal: ${recommendationCalories.join(',')}`)
  }

  const bankLog = {
    id: `UX-CBANK-${stamp}`,
    name: 'UX calorie bank context',
    calories: displayedTarget + 9,
    protein_g: proteinTarget,
    fat_g: Math.max(1, fatTarget - 5),
    carbs_g: Math.max(1, carbsTarget - 5),
    slot: 'meal3',
    logged_at: new Date().toISOString(),
    user_declared: true,
    source: 'search',
    nutrition_status: 'confirmed',
  }
  await clearTodayFoodCaches(page, recordTodayDate)
  await page.goto('about:blank')
  await new Promise(resolve => setTimeout(resolve, 750))
  await replaceTodayFoodLogs(userId, recordTodayDate, [bankLog])
  await new Promise(resolve => setTimeout(resolve, 500))
  const bankLogsOnServer = foodLogsFromRows(
    await adminJson(`daily_checkins?user_id=eq.${userId}&checkin_date=eq.${recordTodayDate}&select=notes`)
  )
  if (!bankLogsOnServer.some(log => log.id === bankLog.id)) {
    await replaceTodayFoodLogs(userId, recordTodayDate, [bankLog])
  }
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle0' })
  await page.evaluate(({ date, log }) => {
    sessionStorage.setItem(`bb_food_logs_${date}`, JSON.stringify([log]))
    localStorage.setItem('bb_today_offline_v1', JSON.stringify({
      date,
      food_logs_today: [log],
      updated_at: new Date().toISOString(),
    }))
  }, { date: recordTodayDate, log: bankLog })
  await page.reload({ waitUntil: 'networkidle0' })
  await page.waitForFunction(() => document.body.innerText.includes('今天稍微超標了'))
  await page.evaluate(() => {
    document.documentElement.classList.add('capacitor-ios')
    document.documentElement.style.setProperty('--app-safe-top', '59px')
    document.documentElement.style.setProperty('--app-safe-bottom', '34px')
  })
  await clickButtonContaining(page, '查看回補計畫')
  await page.waitForFunction(() => document.body.innerText.includes('選擇分攤天數'))

  const bankHeader = await page.evaluate(() => {
    const header = document.querySelector('.v2-calorie-bank-detail .app-tab-header')
    const back = header?.querySelector('button[aria-label="返回"]')
    const headerRect = header?.getBoundingClientRect()
    const backRect = back?.getBoundingClientRect()
    return {
      headerTop: headerRect?.top,
      headerHeight: headerRect?.height,
      backWidth: backRect?.width,
      backHeight: backRect?.height,
      hasInfo: Boolean(header?.querySelector('[aria-label="說明"]')),
    }
  })
  if (
    bankHeader.headerTop < 59 ||
    bankHeader.headerTop > 72 ||
    bankHeader.headerHeight !== 52 ||
    bankHeader.backWidth < 44 ||
    bankHeader.backHeight < 44 ||
    bankHeader.hasInfo
  ) {
    throw new Error(`Calorie Bank header mismatch: ${JSON.stringify(bankHeader)}`)
  }

  const bankSpreads = {}
  for (const days of [3, 5, 10]) {
    await clickButton(page, `${days} 天`)
    bankSpreads[days] = await page.$$eval('.v2-spread-adjust', rows =>
      rows.map(row => Number(row.textContent?.match(/-?[\d,]+/)?.[0].replaceAll(',', '')))
    )
    const total = bankSpreads[days].reduce((sum, value) => sum + Math.abs(value), 0)
    if (total !== 9) throw new Error(`${days}-day spread totaled ${total}, expected 9`)
  }
  await clickButton(page, '5 天')
  await clickButton(page, '確認回補計畫')
  await page.waitForFunction(() => !document.body.innerText.includes('選擇分攤天數'))
  const savedPrefs = await adminJson(`user_profiles?id=eq.${userId}&select=settings_preferences`)
  if (savedPrefs[0]?.settings_preferences?.calorie_bank_days !== 5) {
    throw new Error('Calorie Bank spread preference did not persist')
  }
  await page.waitForFunction(
    target => {
      const match = document.body.innerText.match(/每日預算\s*([\d,]+)\s*kcal/)
      return Number(match?.[1]?.replaceAll(',', '')) === target
    },
    {},
    displayedTarget - 2
  )
  uxRecCbankAcceptance = {
    longPressMs: 800,
    scrollCancelled: true,
    recommendationRemainingCalories: 402,
    recommendationCalories,
    unsafeRecommendationsAbsent: true,
    bankHeader,
    bankSpreads,
    savedSpreadDays: 5,
    adjustedDailyTarget: displayedTarget - 2,
  }

  for (const path of ['/dashboard', '/weekly', '/progress', '/settings']) {
    geometry.push(await measureTabGeometry(page, path))
  }
  const expectedHeaderHeight = geometry[0].headerHeight
  const expectedNavHeight = geometry[0].navHeight
  for (const item of geometry) {
    if (
      item.headerHeight !== expectedHeaderHeight ||
      item.headerHeight !== 52 ||
      item.navHeight !== expectedNavHeight ||
      item.navRowHeight !== 52 ||
      item.navBottomGap !== 34 ||
      item.contentBottomPadding !== 16 ||
      item.horizontalOverflow
    ) {
      throw new Error(`Shared tab geometry mismatch on ${item.path}`)
    }
  }

  await page.goto(`${baseUrl}/settings/profile`, { waitUntil: 'networkidle0' })
  await page.waitForSelector('#height-inline')
  const settingsHeight = await page.$eval('#height-inline', element => Number(element.value))
  if (settingsHeight !== input.heightCm) throw new Error('Settings profile did not retain height')

  await page.goto(`${baseUrl}/settings`, { waitUntil: 'networkidle0' })
  await clickButton(page, '登出帳號')
  await clickButton(page, '登出')
  await page.waitForFunction(() => window.location.pathname === '/login', { timeout: 30_000 })
  await replaceInput(page, '#email', email)
  await replaceInput(page, '#password', password)
  await page.click('button[type="submit"]')
  await page.waitForFunction(() => window.location.pathname === '/dashboard', {
    timeout: 30_000,
  })
  await page.waitForFunction(() => {
    const match = document.body?.innerText.match(/每日預算\s*([\d,]+)\s*kcal/)
    const target = Number(match?.[1]?.replaceAll(',', ''))
    return Number.isFinite(target) && target > 0 && target !== 2000
  })

  console.log(
    JSON.stringify({
      input,
      calculatedBaseCalories: expectedCalories,
      exerciseAdjustment,
      expectedCalories: expectedTodayCalories,
      actualCalories,
      difference: actualCalories - expectedTodayCalories,
      profileExists: profiles.length === 1,
      activeGoalCount: goals.length,
      bodyDataSource: 'user_profiles',
      todayLoaderSource: 'weekly_plans.plan_data.days[current-date].daily_targets',
      refreshPersisted,
      logoutLoginPersisted: true,
      settingsHeightMatches: true,
      recordDateAcceptance,
      uxRecCbankAcceptance,
      geometry,
      viewportCaptureCount: geometry.length,
      transitionNotFoundErrors: transitionErrors.length,
      blockingApiOrPageErrors: blockingErrors,
      cleanup: 'pending',
    })
  )
} catch (error) {
  let pageState = null
  if (page) {
    try {
      pageState = {
        url: page.url(),
        path: new URL(page.url()).pathname,
        bodyText: (await page.locator('body').map(element => element.innerText).wait()).slice(0, 2000),
        controls: await page.$$eval('button, input[type="checkbox"]', elements =>
          elements.map(element => ({
            text: element.textContent?.replace(/\s+/g, ' ').trim() || element.getAttribute('type'),
            disabled: 'disabled' in element ? element.disabled : false,
            checked: 'checked' in element ? element.checked : undefined,
          }))
        ),
        visibleError: (await page.locator('body').map(element => element.innerText).wait())
          .split('\n')
          .filter(line => /錯誤|失敗|尚未|再試|找不到|404/.test(line))
          .slice(0, 10),
      }
    } catch {
      pageState = { path: 'unavailable', visibleError: [] }
    }
  }
  console.error(
    JSON.stringify({
      failure: error instanceof Error ? error.message : String(error),
      pageState,
      transitionErrors,
      geometry,
      blockingErrors,
    })
  )
  throw error
} finally {
  if (transitionPoll) clearInterval(transitionPoll)
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
