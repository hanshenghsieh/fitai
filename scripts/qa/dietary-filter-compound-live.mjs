import puppeteer from 'puppeteer'

const baseUrl = process.env.QA_BASE_URL || 'http://localhost:3010'
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const configuredSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
if (!serviceKey || !configuredSupabaseUrl) throw new Error('Missing Supabase QA environment')

const supabaseUrl = new URL(configuredSupabaseUrl).origin
const stamp = Date.now()
const email = `qa-dietary-compound-${stamp}@betterbit.test`
const password = `Qa-${stamp}-Safe!`
let userId = null
let browser

const forbiddenPorkOrEgg =
  /排骨|豬|猪|控肉|焢肉|爌肉|滷肉|魯肉|卤肉|肉燥|五花肉|叉燒|火腿|培根|香腸|臘腸|貢丸|大腸|肥腸|豬腳|豬肝|豬血|蛋炒飯|荷包蛋|滷蛋|魯蛋|茶葉蛋|炒蛋|滑蛋|蒸蛋|蛋花|蛋餅|加蛋|玉子|歐姆蛋|厚蛋|雞蛋/
const porkOnly =
  /排骨|豬|猪|控肉|焢肉|爌肉|滷肉|魯肉|卤肉|肉燥|五花肉|叉燒|火腿|培根|香腸|臘腸|貢丸|大腸|肥腸|豬腳|豬肝|豬血/

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
      item => item.textContent?.replace(/✓/g, '').replace(/\s+/g, ' ').trim() === expected
    )
    button?.click()
    return Boolean(button)
  }, text)
  if (!clicked) throw new Error(`Button not found: ${text}`)
}

async function setChip(page, label, active) {
  const state = await page.evaluate(expected => {
    const button = [...document.querySelectorAll('button')].find(
      item => item.textContent?.replace('✓', '').replace(/\s+/g, ' ').trim() === expected
    )
    if (!button) return null
    return button.classList.contains('v2-sv2-chip--active')
  }, label)
  if (state == null) throw new Error(`Chip not found: ${label}`)
  if (state !== active) await clickButton(page, label)
}

async function saveDietSettings(page) {
  const responsePromise = page.waitForResponse(
    response =>
      response.url().endsWith('/api/settings/preferences') &&
      response.request().method() === 'PATCH',
    { timeout: 30_000 }
  )
  await clickButton(page, '儲存飲食偏好')
  const response = await responsePromise
  if (!response.ok()) throw new Error(`Preference save failed: ${response.status()}`)
  await page.waitForFunction(() =>
    [...document.querySelectorAll('button')].some(
      button =>
        button.textContent?.replace(/\s+/g, ' ').includes('儲存飲食偏好') &&
        button.disabled
    )
  )
}

async function readStoredRestrictions() {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/user_profiles?id=eq.${userId}&select=settings_preferences`,
    { headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey } }
  )
  if (!response.ok) throw new Error(`Preference verification failed: ${response.status}`)
  const rows = await response.json()
  return rows[0]?.settings_preferences?.diet_extras?.diet_restrictions ?? []
}

async function rollAndRead(page, first = false) {
  if (first) {
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('betterbit:roll-dice')))
  } else {
    await clickButton(page, '換推薦')
  }
  await new Promise(resolve => setTimeout(resolve, 250))
  await page.waitForFunction(
    () => {
      const name = document.querySelector('[data-dietary-recommendation-name]')
      const reroll = [...document.querySelectorAll('button')].find(button =>
        button.textContent?.includes('換推薦')
      )
      return Boolean(name && reroll && !reroll.disabled)
    },
    { timeout: 30_000 }
  )
  return page.$eval('[data-dietary-recommendation-name]', node =>
    node.textContent?.replace(/\s+/g, ' ').trim()
  )
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
        // Registration navigation will expose a failure.
      }
    }
  })

  await page.goto(`${baseUrl}/register`, { waitUntil: 'networkidle0' })
  await replaceInput(page, '#name', 'Dietary Compound QA')
  await replaceInput(page, '#email', email)
  await replaceInput(page, '#password', password)
  await page.click('button[type="submit"]')
  await page.waitForFunction(() => location.pathname === '/onboarding')
  await replaceInput(page, '#age', 34)
  await replaceInput(page, '#height', 175)
  await replaceInput(page, '#weight', 72)
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

  await page.goto(`${baseUrl}/settings/diet`, { waitUntil: 'networkidle0' })
  await setChip(page, '不吃豬', true)
  await setChip(page, '不吃蛋', true)
  await saveDietSettings(page)
  const enabledRestrictions = await readStoredRestrictions()
  if (!enabledRestrictions.includes('no_pork') || !enabledRestrictions.includes('no_egg')) {
    throw new Error(`Server preferences missing restrictions: ${enabledRestrictions.join(',')}`)
  }

  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle0' })
  await page.reload({ waitUntil: 'networkidle0' })
  const protectedRolls = []
  for (let index = 0; index < 30; index += 1) {
    const name = await rollAndRead(page, index === 0)
    if (!name) throw new Error(`Roll ${index + 1} produced no recommendation`)
    if (forbiddenPorkOrEgg.test(name)) throw new Error(`Forbidden roll ${index + 1}: ${name}`)
    protectedRolls.push(name)
  }

  await page.goto(`${baseUrl}/settings/diet`, { waitUntil: 'networkidle0' })
  await setChip(page, '不吃豬', false)
  await saveDietSettings(page)
  const disabledRestrictions = await readStoredRestrictions()
  if (disabledRestrictions.includes('no_pork') || !disabledRestrictions.includes('no_egg')) {
    throw new Error(`Unexpected restrictions after disabling pork: ${disabledRestrictions.join(',')}`)
  }

  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'networkidle0' })
  await page.reload({ waitUntil: 'networkidle0' })
  const reenabledRolls = []
  let porkReturned = null
  for (let index = 0; index < 60 && !porkReturned; index += 1) {
    const name = await rollAndRead(page, index === 0)
    reenabledRolls.push(name)
    if (porkOnly.test(name)) porkReturned = name
  }
  if (!porkReturned) throw new Error('Pork did not re-enter the live recommendation pool')

  console.log(JSON.stringify({
    account: email,
    enabledRestrictions,
    protectedRollCount: protectedRolls.length,
    protectedUniqueRecommendations: [...new Set(protectedRolls)],
    disabledRestrictions,
    porkReturned,
    reenabledRollCount: reenabledRolls.length,
    refreshVerified: true,
    cleanup: 'pending',
  }))
} finally {
  if (browser) await browser.close()
  if (userId) {
    const cleanup = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
    })
    if (!cleanup.ok) throw new Error(`Temporary account cleanup failed: ${cleanup.status}`)
    console.log(JSON.stringify({ cleanup: 'completed', userId }))
  }
}

