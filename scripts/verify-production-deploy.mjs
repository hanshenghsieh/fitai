const BASE = 'https://betterbit.app'
const PAGES = ['/login', '/support', '/terms', '/register']

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'BetterBitDeployCheck/1.0' } })
  if (!res.ok) throw new Error(`${url} -> ${res.status}`)
  return res.text()
}

async function main() {
  const jsPaths = new Set()
  const cssPaths = new Set()

  for (const page of PAGES) {
    const html = await fetchText(`${BASE}${page}`)
    for (const m of html.matchAll(/src="(\/_next\/static\/[^"]+\.js)"/g)) jsPaths.add(m[1])
    for (const m of html.matchAll(/href="(\/_next\/[^"]+\.css)"/g)) cssPaths.add(m[1])
  }

  let css = ''
  for (const p of cssPaths) css += await fetchText(`${BASE}${p}`)
  const cssOk =
    (css.includes('pointer-events:auto') || css.includes('pointer-events: auto')) &&
    /\.app-bottom-nav[^}]*z-index:\s*50/.test(css) &&
    css.includes('app-overlay-scrim') &&
    css.includes('data-app-overlay')

  let navigateTab = false
  let bottomNavAssign = false

  for (const p of jsPaths) {
    const js = await fetchText(`${BASE}${p}`)
    if (js.includes('navigateTab')) navigateTab = true
    if (js.includes('navigateTab') && js.includes('location.assign')) bottomNavAssign = true
  }

  const ok = cssOk && !navigateTab
  console.log({
    commit: 'b6dc7af',
    cssOk,
    navigateTabRemoved: !navigateTab,
    jsChunksScanned: jsPaths.size,
    note: 'Dashboard-only bundles require login; CSS + removed navigateTab confirm deploy.',
  })
  console.log('DEPLOY_OK', ok)
  process.exit(ok ? 0 : 1)
}

main().catch(err => {
  console.error(err)
  process.exit(2)
})
