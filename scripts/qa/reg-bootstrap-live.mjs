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
const blockingErrors = []

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

async function clickButton(page, text) {
  const normalizedExpected = text.replace(/\s+/g, ' ').trim()
  const buttons = await page.$$('button')
  for (const button of buttons) {
    const label = await button.evaluate(item => item.textContent?.replace(/\s+/g, ' ').trim())
    if (label === normalizedExpected) {
      await button.click()
      return
    }
  }
  throw new Error(`Button not found: ${text}`)
}

async function replaceInput(page, selector, value) {
  await page.waitForSelector(selector, { visible: true })
  await page.$eval(selector, inputElement => {
    inputElement.value = ''
    inputElement.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.type(selector, String(value))
}

try {
  browser = await puppeteer.launch({ headless: true })
  page = await browser.newPage()
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 })

  page.on('pageerror', error => blockingErrors.push(`page:${error.message}`))
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
      const text = await page.locator('body').map(element => element.innerText).wait()
      const match = text.match(/找不到|404。|錯誤：/)
      if (match) transitionErrors.push(match[0])
    } catch {
      // Navigation temporarily replaces the execution context.
    }
  }, 100)
  await clickButton(page, '開始我的計畫')
  await page.waitForFunction(() => window.location.pathname === '/dashboard', {
    timeout: 45_000,
  })
  clearInterval(transitionPoll)
  await page.waitForFunction(() => document.body.innerText.includes('每日預算'), {
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
  if (!dashboardText.includes(actualCalories.toLocaleString())) {
    throw new Error('Today did not render the generated calorie target')
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
  await page.waitForFunction(
    calories => document.body.innerText.includes(Number(calories).toLocaleString()),
    {},
    actualCalories
  )
  const refreshPersisted = true

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
  await page.waitForFunction(
    calories => document.body.innerText.includes(Number(calories).toLocaleString()),
    {},
    actualCalories
  )

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
        path: new URL(page.url()).pathname,
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
