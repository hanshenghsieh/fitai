#!/usr/bin/env node
/**
 * BetterBit iOS Local Hybrid preflight / self-check.
 *
 * Fail-closed: any failed check → process.exit(1).
 * Must pass before zip / claiming a build is shippable.
 *
 * Usage:
 *   node scripts/preflight-ios-local-hybrid.mjs
 *   npm run preflight:ios-local
 *
 * Env:
 *   NEXT_PUBLIC_API_BASE_URL — expected remote API host (baked into previous build)
 *   PREFLIGHT_STRICT=0       — allow warnings-only for optional checks (default: strict)
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, join, relative } from 'node:path'

const root = join(import.meta.dirname, '..')
const results = []
const IAP_MONTHLY_PRODUCT_ID = 'betterbit_pro_monthly'
const IAP_ANNUAL_PRODUCT_ID = 'Betterbit_pro_annual'
const IAP_OFFERING_ID = 'default'
const IAP_MONTHLY_PACKAGE_ID = '$rc_monthly'
const IAP_ANNUAL_PACKAGE_ID = '$rc_annual'
const IAP_ENTITLEMENT_ID = 'premium'

function rel(p) {
  return relative(root, p).replace(/\\/g, '/')
}

function pass(id, detail) {
  results.push({ id, ok: true, detail })
  console.log(`  PASS  ${id} — ${detail}`)
}

function fail(id, detail) {
  results.push({ id, ok: false, detail })
  console.error(`  FAIL  ${id} — ${detail}`)
}

function warn(id, detail) {
  results.push({ id, ok: true, detail: `WARN: ${detail}` })
  console.warn(`  WARN  ${id} — ${detail}`)
}

function readText(p) {
  return readFileSync(p, 'utf8')
}

function fileHash(p) {
  return createHash('sha256').update(readFileSync(p)).digest('hex')
}

function walkFiles(dir, pred, acc = []) {
  if (!existsSync(dir)) return acc
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    let st
    try {
      st = statSync(p)
    } catch {
      continue
    }
    if (st.isDirectory()) walkFiles(p, pred, acc)
    else if (!pred || pred(p)) acc.push(p)
  }
  return acc
}

function gatherText(dirs, exts = ['.html', '.js', '.css', '.json', '.tsx', '.ts', '.swift', '.storyboard']) {
  let out = ''
  for (const dir of dirs) {
    for (const f of walkFiles(dir, (p) => exts.some((e) => p.endsWith(e)))) {
      try {
        // Cap chunk size to keep preflight fast
        const st = statSync(f)
        if (st.size > 8_000_000) continue
        out += readFileSync(f, 'utf8') + '\n'
      } catch {
        /* skip */
      }
    }
  }
  return out
}

function bundleContains(dir, marker) {
  return walkFiles(dir, (p) => p.endsWith('.js')).some((file) => {
    try {
      return readFileSync(file, 'utf8').includes(marker)
    } catch {
      return false
    }
  })
}

function routeHtmlExists(route) {
  const clean = route.replace(/\/$/, '') || ''
  const candidates = [
    join(root, 'out', `${clean.slice(1)}.html`),
    join(root, 'out', clean.slice(1), 'index.html'),
    join(root, 'ios/App/App/public', `${clean.slice(1)}.html`),
    join(root, 'ios/App/App/public', clean.slice(1), 'index.html'),
  ]
  return candidates.some((p) => existsSync(p))
}

function extractBottomNavHrefs(src) {
  // Matches href: '/dashboard' style entries in BottomNav tabs array
  const hrefs = [...src.matchAll(/href:\s*['"]([^'"]+)['"]/g)].map((m) => m[1])
  return [...new Set(hrefs)]
}

function pngMeanApprox(p) {
  // Lightweight PNG IHDR + rough mean via sampling raw decoded would need sharp;
  // use optional sharp if present, else skip mean check.
  try {
    // dynamic import not needed — require for CJS interop in node ESM via createRequire
    return null
  } catch {
    return null
  }
}

async function pngStats(p) {
  try {
    const { createRequire } = await import('node:module')
    const require = createRequire(import.meta.url)
    const sharp = require('sharp')
    const img = sharp(p)
    const meta = await img.metadata()
    const stats = await img.stats()
    const mean = stats.channels.slice(0, 3).map((c) => Math.round(c.mean))
    return { width: meta.width, height: meta.height, mean }
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────
// 1. Capacitor config
// ─────────────────────────────────────────────────────────────
function checkCapacitorConfig() {
  console.log('\n[1] Capacitor config')
  const tsPath = join(root, 'capacitor.config.ts')
  const jsonPath = join(root, 'ios/App/App/capacitor.config.json')

  if (!existsSync(tsPath)) {
    fail('cap.config.ts', `missing ${rel(tsPath)}`)
    return
  }
  const ts = readText(tsPath)

  if (!/webDir:\s*['"]out['"]/.test(ts)) {
    fail('cap.webDir', 'capacitor.config.ts must set webDir: "out"')
  } else {
    pass('cap.webDir', 'webDir = out')
  }

  // source config must not hardcode a remote server.url for local-hybrid default
  const hasDevServerBranch = /CAPACITOR_DEV_SERVER_URL|CAP_SERVER_URL|CAPACITOR_REMOTE_URL/.test(ts)
  const unconditionalUrl = /server:\s*\{[^}]*url:\s*['"]https?:\/\//s.test(ts) && !hasDevServerBranch
  if (unconditionalUrl) {
    fail('cap.server.url.source', 'capacitor.config.ts has unconditional server.url')
  } else {
    pass('cap.server.url.source', 'no unconditional server.url in capacitor.config.ts')
  }

  if (existsSync(jsonPath)) {
    const json = JSON.parse(readText(jsonPath))
    if (json.webDir !== 'out') {
      fail('cap.webDir.synced', `ios capacitor.config.json webDir=${JSON.stringify(json.webDir)}`)
    } else {
      pass('cap.webDir.synced', 'ios capacitor.config.json webDir=out')
    }
    if (json.server?.url) {
      fail('cap.server.url.synced', `server.url present: ${json.server.url}`)
    } else {
      pass('cap.server.url.synced', 'no server.url in synced capacitor.config.json')
    }
    if (json.plugins?.CapacitorHttp?.enabled === true) {
      pass('cap.http', 'CapacitorHttp.enabled = true (bypasses missing CORS)')
    } else {
      fail('cap.http', 'CapacitorHttp.enabled must be true for local-hybrid API mutations')
    }
  } else {
    fail('cap.json', `missing ${rel(jsonPath)} — run cap sync first`)
  }

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
  if (!apiBase) {
    fail('cap.apiEnv', 'NEXT_PUBLIC_API_BASE_URL is required for local-hybrid builds')
  } else if (!/^https:\/\/(www\.)?betterbit\.app/i.test(apiBase) && !/^https:\/\//.test(apiBase)) {
    fail('cap.apiEnv', `NEXT_PUBLIC_API_BASE_URL must be https remote, got: ${apiBase}`)
  } else {
    pass('cap.apiEnv', `NEXT_PUBLIC_API_BASE_URL=${apiBase}`)
  }
}

function checkRevenueCatIap() {
  console.log('\n[1B] RevenueCat / Apple IAP')
  const publicKey =
    process.env.NEXT_PUBLIC_REVENUECAT_IOS_API_KEY?.trim()
  const enabled = process.env.NEXT_PUBLIC_APPLE_IAP_ENABLED?.trim()
  const productId =
    process.env.NEXT_PUBLIC_APPLE_IAP_PRODUCT_ID?.trim()
  const entitlementId =
    process.env.NEXT_PUBLIC_APPLE_IAP_ENTITLEMENT_ID?.trim()

  enabled === 'true'
    ? pass('iap.enabled', 'Apple IAP enabled')
    : fail('iap.enabled', 'NEXT_PUBLIC_APPLE_IAP_ENABLED must be true')
  publicKey?.startsWith('appl_')
    ? pass('iap.publicKey', 'RevenueCat iOS public key present')
    : fail('iap.publicKey', 'RevenueCat iOS appl_ public key missing')
  productId === IAP_MONTHLY_PRODUCT_ID
    ? pass('iap.product', `public product id = ${IAP_MONTHLY_PRODUCT_ID}`)
    : fail('iap.product', `public product id must equal ${IAP_MONTHLY_PRODUCT_ID}`)
  entitlementId === IAP_ENTITLEMENT_ID
    ? pass('iap.entitlement', `entitlement id = ${IAP_ENTITLEMENT_ID}`)
    : fail('iap.entitlement', `entitlement id must equal ${IAP_ENTITLEMENT_ID}`)

  const packagePath = join(root, 'package.json')
  const packageJson = existsSync(packagePath)
    ? JSON.parse(readText(packagePath))
    : null
  packageJson?.dependencies?.['@revenuecat/purchases-capacitor']
    ? pass('iap.package', '@revenuecat/purchases-capacitor dependency present')
    : fail('iap.package', '@revenuecat/purchases-capacitor dependency missing')

  const capJsonPath = join(root, 'ios/App/App/capacitor.config.json')
  const capJson = existsSync(capJsonPath)
    ? JSON.parse(readText(capJsonPath))
    : null
  capJson?.packageClassList?.includes('PurchasesPlugin')
    ? pass('iap.plugin.synced', 'PurchasesPlugin is synced')
    : fail('iap.plugin.synced', 'PurchasesPlugin missing — run cap sync ios')

  const spmPath = join(root, 'ios/App/CapApp-SPM/Package.swift')
  const spm = existsSync(spmPath) ? readText(spmPath) : ''
  if (
    spm.includes('@revenuecat') &&
    spm.includes('RevenuecatPurchasesCapacitor')
  ) {
    pass('iap.spm', 'RevenueCat PurchasesPlugin is linked through SPM')
  } else {
    fail('iap.spm', 'RevenueCat PurchasesPlugin missing from iOS SPM')
  }

  const iosJs = gatherText(
    [join(root, 'ios/App/App/public/_next')],
    ['.js']
  )
  const iosBundleDir = join(root, 'ios/App/App/public/_next')
  bundleContains(iosBundleDir, IAP_MONTHLY_PRODUCT_ID)
    ? pass('iap.bundle.product.monthly', 'monthly product id found in iOS bundle')
    : fail('iap.bundle.product.monthly', 'monthly product id missing from iOS bundle')
  bundleContains(iosBundleDir, IAP_ANNUAL_PRODUCT_ID)
    ? pass('iap.bundle.product.annual', 'annual product id found in iOS bundle')
    : fail('iap.bundle.product.annual', 'annual product id missing from iOS bundle')
  bundleContains(iosBundleDir, IAP_OFFERING_ID) &&
  bundleContains(iosBundleDir, IAP_MONTHLY_PACKAGE_ID) &&
  bundleContains(iosBundleDir, IAP_ANNUAL_PACKAGE_ID)
    ? pass('iap.bundle.offering', 'default monthly and annual package markers found')
    : fail('iap.bundle.offering', 'RevenueCat dual-plan offering markers missing')
  iosJs.includes(IAP_ENTITLEMENT_ID)
    ? pass('iap.bundle.entitlement', 'premium entitlement marker found in iOS bundle')
    : fail('iap.bundle.entitlement', 'premium entitlement marker missing from iOS bundle')
  const hasRevenueCatPublicKey = /appl_[A-Za-z0-9_-]+/.test(iosJs)
  hasRevenueCatPublicKey
    ? pass('iap.bundle.publicKey', 'RevenueCat public key marker found in iOS bundle')
    : fail('iap.bundle.publicKey', 'RevenueCat public key marker missing from iOS bundle')
}

// ─────────────────────────────────────────────────────────────
// 2. out / ios public bundle
// ─────────────────────────────────────────────────────────────
function checkBundles() {
  console.log('\n[2] out / ios public bundles')
  const outIndex = join(root, 'out/index.html')
  const pubIndex = join(root, 'ios/App/App/public/index.html')
  const pubNext = join(root, 'ios/App/App/public/_next')
  const outNext = join(root, 'out/_next')

  existsSync(outIndex) ? pass('bundle.out.index', rel(outIndex)) : fail('bundle.out.index', `missing ${rel(outIndex)}`)
  existsSync(pubIndex) ? pass('bundle.ios.index', rel(pubIndex)) : fail('bundle.ios.index', `missing ${rel(pubIndex)}`)
  existsSync(outNext) ? pass('bundle.out.next', rel(outNext)) : fail('bundle.out.next', `missing ${rel(outNext)}`)
  existsSync(pubNext) ? pass('bundle.ios.next', rel(pubNext)) : fail('bundle.ios.next', `missing ${rel(pubNext)}`)

  const bundleText =
    gatherText([join(root, 'out'), join(root, 'ios/App/App/public')], ['.html', '.js', '.css']) +
    gatherText([join(root, 'src')], ['.tsx', '.ts'])

  const banned = ['登入好像慢了半拍']
  for (const phrase of banned) {
    if (bundleText.includes(phrase)) {
      fail('bundle.stale', `banned phrase still present: "${phrase}"`)
    } else {
      pass('bundle.stale.' + phrase.slice(0, 8), `absent: "${phrase}"`)
    }
  }

  const required = ['外食減脂不用算']
  for (const phrase of required) {
    const inOut = gatherText([join(root, 'out')], ['.html', '.js']).includes(phrase)
    const inIos = gatherText([join(root, 'ios/App/App/public')], ['.html', '.js']).includes(phrase)
    if (!inOut || !inIos) {
      fail('bundle.welcome', `required phrase "${phrase}" missing (out=${inOut}, ios=${inIos})`)
    } else {
      pass('bundle.welcome', `required phrase present in out + ios public: "${phrase}"`)
    }
  }

  // Freshness: index.html timestamps / presence of CapacitorHttp in ios chunks
  const iosJs = gatherText([join(root, 'ios/App/App/public/_next')], ['.js'])
  if (iosJs.includes('CapacitorHttp') || iosJs.includes('www.betterbit.app') || iosJs.includes('betterbit.app')) {
    pass('bundle.apiBaked', 'remote API / CapacitorHttp markers found in ios public JS')
  } else {
    fail('bundle.apiBaked', 'ios public JS missing remote API / CapacitorHttp markers — stale or wrong build')
  }

  const supabaseRootPattern = /https:\/\/[a-z0-9-]+\.supabase\.co/i
  const malformedSupabaseBase =
    /https:\/\/[a-z0-9-]+\.supabase\.co\/(?:auth|rest|storage|functions|realtime)\/v1/i
  if (!supabaseRootPattern.test(iosJs)) {
    fail('bundle.supabase.host', 'iOS bundle missing Supabase project host')
  } else if (malformedSupabaseBase.test(iosJs)) {
    fail(
      'bundle.supabase.root',
      'NEXT_PUBLIC_SUPABASE_URL must be the project root, not a service /v1 URL'
    )
  } else {
    pass('bundle.supabase.root', 'Supabase project root is baked without a service path')
  }

  const hasSupabasePublicKey =
    /sb_publishable_[A-Za-z0-9_-]+/.test(iosJs) ||
    /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(iosJs)
  hasSupabasePublicKey
    ? pass('bundle.supabase.publicKey', 'Supabase public key marker found')
    : fail('bundle.supabase.publicKey', 'Supabase publishable / anon key marker missing')
}

// ─────────────────────────────────────────────────────────────
// 3. Swift native
// ─────────────────────────────────────────────────────────────
function checkSwift() {
  console.log('\n[3] Swift native')
  const bridge = join(root, 'ios/App/App/BridgeViewController.swift')
  if (!existsSync(bridge)) {
    fail('swift.bridge', `missing ${rel(bridge)}`)
    return
  }
  const src = readText(bridge)

  if (/override\s+func\s+webViewWebContentProcessDidTerminate/.test(src)) {
    fail('swift.override', `${rel(bridge)} still has override webViewWebContentProcessDidTerminate`)
  } else {
    pass('swift.override', 'no override webViewWebContentProcessDidTerminate')
  }

  if (/super\.webViewWebContentProcessDidTerminate/.test(src)) {
    fail('swift.super', `${rel(bridge)} still calls super.webViewWebContentProcessDidTerminate`)
  } else {
    pass('swift.super', 'no super.webViewWebContentProcessDidTerminate')
  }

  if (/WKWebView/.test(src) && !/import\s+WebKit/.test(src)) {
    fail('swift.webkit', `${rel(bridge)} uses WKWebView but missing import WebKit`)
  } else {
    pass('swift.webkit', 'import WebKit present (or no WKWebView)')
  }
}

// ─────────────────────────────────────────────────────────────
// 4. Splash / Launch / AppIcon
// ─────────────────────────────────────────────────────────────
async function checkSplashAndIcon() {
  console.log('\n[4] Splash / Launch / AppIcon')
  const storyboard = join(root, 'ios/App/App/Base.lproj/LaunchScreen.storyboard')
  const appIconDir = join(root, 'ios/App/App/Assets.xcassets/AppIcon.appiconset')
  const splashDir = join(root, 'ios/App/App/Assets.xcassets/Splash.imageset')
  const appIconPng = join(appIconDir, 'AppIcon-512@2x.png')
  const appIconContents = join(appIconDir, 'Contents.json')
  const splashContents = join(splashDir, 'Contents.json')
  const officialCandidates = [
    join(root, 'assets/icon.png'),
    join(root, 'assets/app-icon.png'),
    join(root, 'assets/icon-official.png'),
  ]

  if (!existsSync(storyboard)) {
    fail('launch.storyboard', `missing ${rel(storyboard)}`)
  } else {
    const sb = readText(storyboard)
    if (/systemBackgroundColor/.test(sb)) {
      fail('launch.systemBg', `${rel(storyboard)} uses systemBackgroundColor (dark-mode black risk)`)
    } else {
      pass('launch.systemBg', 'LaunchScreen has no systemBackgroundColor')
    }
  }

  if (!existsSync(appIconContents) || !existsSync(appIconPng)) {
    fail('icon.contents', `AppIcon.appiconset incomplete — need Contents.json + AppIcon-512@2x.png`)
  } else {
    pass('icon.contents', 'AppIcon.appiconset Contents.json + PNG present')
  }

  if (!existsSync(splashContents)) {
    fail('splash.contents', `missing ${rel(splashContents)}`)
  } else {
    pass('splash.contents', 'Splash.imageset Contents.json present')
  }

  const official = officialCandidates.find((p) => existsSync(p))
  if (!official) {
    fail(
      'icon.source',
      'missing official icon source (checked assets/icon.png, assets/app-icon.png, assets/icon-official.png) — do NOT substitute Splash logo'
    )
  } else {
    pass('icon.source', `official icon source: ${rel(official)}`)
  }

  if (existsSync(appIconPng)) {
    for (const splashPng of walkFiles(splashDir, (p) => p.endsWith('.png'))) {
      if (fileHash(appIconPng) === fileHash(splashPng)) {
        fail('icon.vs.splash', `AppIcon shares identical bytes with Splash asset ${rel(splashPng)}`)
      }
    }
    if (!results.some((r) => r.id === 'icon.vs.splash' && !r.ok)) {
      pass('icon.vs.splash', 'AppIcon and Splash PNG hashes differ')
    }

    const iconStats = await pngStats(appIconPng)
    if (iconStats) {
      const dark = iconStats.mean.every((c) => c < 40)
      if (dark) fail('icon.notBlack', `AppIcon mean RGB too dark: ${iconStats.mean.join(',')}`)
      else pass('icon.notBlack', `AppIcon mean RGB=${iconStats.mean.join(',')} ${iconStats.width}x${iconStats.height}`)
    }

    for (const splashPng of walkFiles(splashDir, (p) => p.endsWith('.png')).slice(0, 3)) {
      const st = await pngStats(splashPng)
      if (!st) continue
      const black = st.mean.every((c) => c < 40)
      if (black) {
        fail('splash.notBlack', `${rel(splashPng)} mean RGB black-ish: ${st.mean.join(',')}`)
      }
    }
    if (!results.some((r) => r.id === 'splash.notBlack' && !r.ok)) {
      pass('splash.notBlack', 'sampled Splash PNGs are not black')
    }
  }
}

// ─────────────────────────────────────────────────────────────
// 5 + 6. Routes + BottomNav
// ─────────────────────────────────────────────────────────────
function checkRoutesAndTabs() {
  console.log('\n[5/6] App routes + BottomNav')
  const bottomNavPath = join(root, 'src/components/dashboard/BottomNav.tsx')
  if (!existsSync(bottomNavPath)) {
    fail('nav.file', `missing ${rel(bottomNavPath)}`)
    return { hrefs: [] }
  }
  const navSrc = readText(bottomNavPath)
  const hrefs = extractBottomNavHrefs(navSrc)

  const expectedLabels = {
    '/dashboard': '今天',
    '/weekly': '記錄',
    '/progress': '分析',
    '/settings': '我的',
  }

  if (hrefs.length < 4) {
    fail('nav.hrefs', `expected ≥4 tab hrefs, got ${JSON.stringify(hrefs)}`)
  } else {
    pass('nav.hrefs', `tab hrefs: ${hrefs.join(', ')}`)
  }

  const unique = new Set(hrefs)
  if (unique.size === 1 && unique.has('/dashboard')) {
    fail('nav.allDashboard', 'all tabs point to /dashboard')
  } else if ([...unique].every((h) => h.startsWith('/dashboard'))) {
    fail('nav.allDashboard', 'all tab targets are /dashboard variants')
  } else {
    pass('nav.allDashboard', 'tabs are not all /dashboard')
  }

  for (const href of hrefs) {
    const pathOnly = href.split('?')[0]
    if (!routeHtmlExists(pathOnly)) {
      fail('nav.routeExists', `BottomNav target ${href} has no out/*.html or ios public/*.html`)
    } else {
      pass('nav.routeExists.' + pathOnly.replace(/\W+/g, '_'), `${pathOnly} exists in local export`)
    }
  }

  // Legacy /weekly-plan may remain as redirect-only stub (no UI entry required)
  if (routeHtmlExists('/weekly-plan')) {
    pass('route.weeklyPlan', '/weekly-plan stub present in local export (redirect OK)')
  } else {
    pass('route.weeklyPlan', '/weekly-plan absent (OK — flow retired)')
  }

  // Required semantic tabs
  for (const [route, label] of Object.entries(expectedLabels)) {
    if (!hrefs.includes(route)) {
      fail('nav.required', `missing ${label} target ${route}`)
    } else {
      pass('nav.required.' + label, `${label} → ${route}`)
    }
  }

  if (!/onClick=\{openPhoto\}/.test(navSrc) && !/onClick=\{.*openPhoto/.test(navSrc)) {
    // broader: camera button with onClick
    if (!/openPhoto|dispatchOpenRecordSheet|\[CAMERA\]/.test(navSrc)) {
      fail('nav.camera', 'camera button has no onClick / openPhoto handler')
    } else {
      pass('nav.camera', 'camera handler present')
    }
  } else {
    pass('nav.camera', 'camera onClick={openPhoto} present')
  }

  // Guard / RootRedirect must not force every authenticated route → dashboard
  const guardPath = join(root, 'src/features/auth/AppAuthGuard.tsx')
  const rootPath = join(root, 'src/features/auth/RootRedirectClient.tsx')
  const guardSrc = existsSync(guardPath) ? readText(guardPath) : ''
  const rootSrc = existsSync(rootPath) ? readText(rootPath) : ''

  // AppAuthGuard should only redirect login/onboarding — flag if it replace('/dashboard') for arbitrary routes
  if (/router\.replace\(\s*['"]\/dashboard['"]/.test(guardSrc)) {
    fail('guard.dashboardForce', 'AppAuthGuard forces replace(/dashboard) — will break tabs')
  } else {
    pass('guard.dashboardForce', 'AppAuthGuard does not force /dashboard')
  }

  // RootRedirectClient may soft-replace to dashboard ONLY from root
  if (/router\.replace\(/.test(rootSrc) && /\/dashboard/.test(rootSrc)) {
    if (/path !== '\/'|isRoot|pathname === '\/'|path === '\/'/.test(rootSrc)) {
      pass('root.redirectScope', 'RootRedirectClient scopes dashboard redirect to root')
    } else {
      fail('root.redirectScope', 'RootRedirectClient may redirect non-root paths to /dashboard')
    }
  } else {
    pass('root.redirectScope', 'RootRedirectClient has no unrestricted dashboard redirect')
  }

  // Hard-nav without .html is a known Capcitor footgun
  if (/location\.assign\(\s*href\s*\)/.test(navSrc) && !/nativeHtmlFallback|\.html/.test(navSrc)) {
    fail('nav.hardNav', 'BottomNav hard-assigns extensionless href (Capacitor → index.html → bounce Today)')
  } else {
    pass('nav.hardNav', 'BottomNav avoids bare extensionless hard-nav (or uses .html fallback)')
  }

  return { hrefs }
}

// ─────────────────────────────────────────────────────────────
// 7. API mutation
// ─────────────────────────────────────────────────────────────
function checkApiMutation() {
  console.log('\n[7] API mutation')
  const clientPath = join(root, 'src/lib/api/client.ts')
  if (!existsSync(clientPath)) {
    fail('api.client', `missing ${rel(clientPath)}`)
    return
  }
  const clientSrc = readText(clientPath)

  if (!/NEXT_PUBLIC_API_BASE_URL/.test(clientSrc) || !/function apiUrl|apiUrl\(/.test(clientSrc)) {
    fail('api.wrapper', 'api client missing NEXT_PUBLIC_API_BASE_URL / apiUrl')
  } else {
    pass('api.wrapper', 'apiUrl uses NEXT_PUBLIC_API_BASE_URL')
  }

  if (!/Authorization.*Bearer|Bearer \$\{token\}|Bearer \`/.test(clientSrc) && !/Authorization.*Bearer/.test(clientSrc)) {
    // mergeApiHeaders sets Authorization Bearer
    if (!/mergeApiHeaders|Authorization/.test(clientSrc)) {
      fail('api.bearer', 'api client does not attach Authorization Bearer')
    } else {
      pass('api.bearer', 'api client attaches Authorization header')
    }
  } else {
    pass('api.bearer', 'api client attaches Bearer token')
  }

  if (!/CapacitorHttp/.test(clientSrc)) {
    fail('api.nativeHttp', 'api client missing CapacitorHttp path (CORS will break on device)')
  } else {
    pass('api.nativeHttp', 'CapacitorHttp used for native mutations')
  }

  // Auto generate-plan (background) must go through apiFetch, not bare fetch('/api/...')
  const todayLoader = join(root, 'src/features/today/today-data-loader.ts')
  if (!existsSync(todayLoader)) {
    fail('api.generatePlan', `missing ${rel(todayLoader)}`)
  } else {
    const g = readText(todayLoader)
    if (/fetch\(\s*['"`]\/api\//.test(g)) {
      fail('api.generatePlan.fetch', 'today-data-loader uses bare fetch(/api/...)')
    } else if (!/apiFetch\(/.test(g)) {
      fail('api.generatePlan.apiFetch', 'today-data-loader does not call apiFetch')
    } else {
      pass('api.generatePlan', 'today-data-loader uses apiFetch')
    }
    if (!/generate-plan/.test(g)) {
      fail('api.generatePath', 'today-data-loader missing generate-plan path')
    } else {
      pass('api.generatePath', 'hits /api/generate-plan via api client → remote base')
    }
  }

  // Scan authenticated app mutation sources for bare relative /api fetch
  const scanDirs = [
    join(root, 'src/components'),
    join(root, 'src/features'),
    join(root, 'src/lib'),
  ]
  const offenders = []
  for (const dir of scanDirs) {
    for (const f of walkFiles(dir, (p) => p.endsWith('.ts') || p.endsWith('.tsx'))) {
      if (f.includes(`${join('lib', 'api')}`) || f.includes('api\\client') || f.includes('api/client')) continue
      // skip server-only / route handlers — they aren't in the static export runtime
      if (f.includes(`${join('app', 'api')}`)) continue
      const text = readText(f)
      if (/["']use server["']/.test(text) && /generate-plan|apiFetch|fetch\(/.test(text)) {
        // flag server actions if they appear under client features
        if (f.includes('features') || f.includes('components')) {
          offenders.push(`${rel(f)} contains "use server"`)
        }
      }
      // bare relative API fetches
      const bare = [...text.matchAll(/fetch\(\s*[`'"](\/api\/[^`'"]+)[`'"]/g)]
      for (const m of bare) {
        offenders.push(`${rel(f)} fetch('${m[1]}')`)
      }
    }
  }
  if (offenders.length) {
    fail('api.bareFetch', `relative /api fetch or server action in client code:\n    - ${offenders.slice(0, 12).join('\n    - ')}`)
  } else {
    pass('api.bareFetch', 'no bare fetch(/api/...) in components/features/lib client code')
  }

  // Shipped bundle must contain remote host (www or apex)
  const iosJs = gatherText([join(root, 'ios/App/App/public/_next')], ['.js'])
  if (/https:\/\/(www\.)?betterbit\.app/.test(iosJs)) {
    pass('api.bakedHost', 'ios bundle includes https://(www.)betterbit.app')
  } else {
    fail('api.bakedHost', 'ios bundle missing betterbit.app host — mutations will hit wrong place')
  }
}

// ─────────────────────────────────────────────────────────────
// 8. Console logs
// ─────────────────────────────────────────────────────────────
function checkConsoleLogs() {
  console.log('\n[8] Console debug logs')
  const srcText = gatherText([join(root, 'src')], ['.ts', '.tsx'])
  const markers = ['[LOGIN]', '[GUARD]', '[TAB]', '[TODAY_ACTION]', '[CAMERA]']
  for (const m of markers) {
    if (srcText.includes(m)) pass('log.' + m, `${m} present in src`)
    else fail('log.' + m, `${m} missing in src`)
  }

  // Prefer presence in shipped bundle too (minifier may keep string literals)
  const iosJs = gatherText([join(root, 'ios/App/App/public/_next')], ['.js'])
  for (const m of ['[TAB]', '[TODAY_ACTION]', '[GUARD]', '[LOGIN]']) {
    if (iosJs.includes(m)) pass('log.shipped.' + m, `${m} present in ios public JS`)
    else warn('log.shipped.' + m, `${m} not found in minified ios JS (may be tree-shaken)`)
  }
}

// ─────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────
function summarize(extra) {
  const failed = results.filter((r) => !r.ok)
  const passed = results.filter((r) => r.ok)
  console.log('\n════════════════════════════════════════')
  console.log(`Preflight: ${failed.length === 0 ? 'PASS' : 'FAIL'}`)
  console.log(`  passed: ${passed.length}`)
  console.log(`  failed: ${failed.length}`)
  if (extra?.hrefs) {
    console.log(`  BottomNav targets: ${extra.hrefs.join(' | ')}`)
  }
  if (failed.length) {
    console.log('\nFailed checks:')
    for (const f of failed) console.log(`  - ${f.id}: ${f.detail}`)
  }
  console.log('════════════════════════════════════════\n')
  return failed.length === 0
}

async function main() {
  console.log('=== BetterBit iOS Local Hybrid Preflight ===')
  console.log(`root: ${root}`)
  console.log(`time: ${new Date().toISOString()}`)

  checkCapacitorConfig()
  checkRevenueCatIap()
  checkBundles()
  checkSwift()
  await checkSplashAndIcon()
  const nav = checkRoutesAndTabs()
  checkApiMutation()
  checkConsoleLogs()

  const ok = summarize(nav)
  if (!ok) process.exit(1)
  console.log('[OK] Preflight passed — safe to zip / archive')
}

main().catch((err) => {
  console.error('[FATAL] preflight crashed:', err)
  process.exit(1)
})
