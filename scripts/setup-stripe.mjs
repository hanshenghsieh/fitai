#!/usr/bin/env node
/**
 * Stripe 一鍵設定腳本
 * 用法：STRIPE_SECRET_KEY=sk_test_xxx node scripts/setup-stripe.mjs
 * 或先執行 stripe login，再執行 node scripts/setup-stripe.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Stripe from 'stripe'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '../.env.local')

function loadEnv() {
  if (!fs.existsSync(envPath)) return {}
  const env = {}
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i > 0) env[t.slice(0, i)] = t.slice(i + 1)
  }
  return env
}

function updateEnv(updates) {
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : ''
  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, 'm')
    const line = `${key}=${value}`
    content = regex.test(content) ? content.replace(regex, line) : content + `\n${line}`
  }
  fs.writeFileSync(envPath, content.trim() + '\n')
}

function readStripeCliConfig() {
  const home = process.env.USERPROFILE || process.env.HOME
  if (!home) return {}
  const configPath = path.join(home, '.config', 'stripe', 'config.toml')
  if (!fs.existsSync(configPath)) return {}
  const content = fs.readFileSync(configPath, 'utf8')
  const pick = (key) => {
    const m = content.match(new RegExp(`${key}\\s*=\\s*"([^"]+)"`))
    return m?.[1]
  }
  return {
    secretKey: pick('test_mode_api_key'),
    publishableKey: pick('test_mode_pub_key'),
  }
}

async function main() {
  const env = loadEnv()
  const cli = readStripeCliConfig()
  const secretKey = process.env.STRIPE_SECRET_KEY || env.STRIPE_SECRET_KEY || cli.secretKey
  const publishableKey = env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || cli.publishableKey

  if (!secretKey || secretKey === '待填') {
    console.error(`
❌ 尚未設定 Stripe Secret Key

請擇一方式：

方式 A — Stripe CLI（推薦）：
  1. stripe login          # 瀏覽器授權（只需做一次）
  2. node scripts/setup-stripe.mjs

方式 B — 手動填入：
  1. 前往 https://dashboard.stripe.com/test/apikeys
  2. 複製 Secret key 和 Publishable key
  3. 執行：
     STRIPE_SECRET_KEY=sk_test_xxx node scripts/setup-stripe.mjs
`)
    process.exit(1)
  }

  const stripe = new Stripe(secretKey)

  // 查詢或建立產品
  const products = await stripe.products.list({ limit: 10, active: true })
  let product = products.data.find(p => p.name?.includes('再健一點') || p.name?.includes('FitAI'))

  if (!product) {
    product = await stripe.products.create({
      name: '再健一點 月付方案',
      description: '每月 500 台幣，達標 20 天享下月免費',
    })
    console.log('✅ 建立產品:', product.id)
  } else {
    console.log('✅ 使用現有產品:', product.id, product.name)
  }

  // 查詢或建立價格
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 10 })
  let price = prices.data.find(p => p.currency === 'twd' && p.unit_amount === 50000)

  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      unit_amount: 50000,
      currency: 'twd',
      recurring: { interval: 'month' },
    })
    console.log('✅ 建立價格:', price.id, 'NT$500/月')
  } else {
    console.log('✅ 使用現有價格:', price.id)
  }

  const updates = {
    STRIPE_SECRET_KEY: secretKey,
    NEXT_PUBLIC_STRIPE_PRICE_ID: price.id,
  }
  if (publishableKey && publishableKey !== '待填') {
    updates.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = publishableKey
  }

  updateEnv(updates)
  console.log('\n✅ 已更新 .env.local:')
  console.log('   STRIPE_SECRET_KEY=sk_test_***')
  console.log('   NEXT_PUBLIC_STRIPE_PRICE_ID=' + price.id)
  if (publishableKey && publishableKey !== '待填') {
    console.log('   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_***')
  } else {
    console.log('\n⚠️  還需手動填入 NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY（pk_test_...）')
    console.log('   從 https://dashboard.stripe.com/test/apikeys 複製')
  }

  console.log('\n⚠️  Webhook 設定（部署後）：')
  console.log('   URL: https://你的網域/api/webhooks/stripe')
  console.log('   事件: customer.subscription.*, payment_intent.*')
}

main().catch(err => {
  console.error('❌', err.message)
  process.exit(1)
})
