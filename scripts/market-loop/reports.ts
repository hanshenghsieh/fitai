import fs from 'fs'
import path from 'path'
import type { LoopAggregate } from './types'
import { adversarialReview, thresholdVerdict, topPatterns } from './adversarial'
import { formatCharacterCard } from './generators'

const OUT = path.join(process.cwd(), 'docs', 'market-loop')
const DATA = path.join(process.cwd(), 'data', 'market-loop')

function pct(n: number, total: number) {
  return total ? `${((n / total) * 100).toFixed(1)}%` : '0%'
}

function mdList(entries: [string, number][], limit = 25) {
  return entries.slice(0, limit).map(([k, v], i) => `${i + 1}. ${k} — **${v}**`).join('\n')
}

export function writeMarketLoopReports(agg: LoopAggregate) {
  fs.mkdirSync(OUT, { recursive: true })
  fs.mkdirSync(DATA, { recursive: true })

  const n = agg.results.length
  const m = (k: keyof (typeof agg.results)[0]['milestones']) => agg.results.filter(r => r.milestones[k]).length
  const subs = agg.results.filter(r => r.outcome === 'subscribed' || r.outcome === 'churned_sub').length
  const refunds = agg.results.filter(r => r.outcome === 'refunded').length
  const recommend = agg.results.filter(r => r.would_recommend).length

  fs.writeFileSync(path.join(DATA, 'characters-500.json'), JSON.stringify(agg.characters, null, 0))
  fs.writeFileSync(path.join(DATA, `sim-${agg.run_id}.json`), JSON.stringify({
    run_id: agg.run_id,
    product: agg.product,
    summary: { n, d30: m('d30'), subs, refunds, recommend },
    results: agg.results.map(r => ({
      id: r.character.id,
      outcome: r.outcome,
      milestones: r.milestones,
      complaints: r.complaints,
      competitor: r.competitor_switch,
    })),
  }))

  const cardsMd = agg.characters.map(formatCharacterCard).join('\n\n')
  fs.writeFileSync(
    path.join(OUT, 'CHARACTER_CARDS_500.md'),
    `# CHARACTER CARDS — 500\n\n**Run:** ${agg.run_id} · **Product:** ${agg.product.version}\n\n> 完整 JSON：\`data/market-loop/characters-500.json\`\n\n${cardsMd}\n`
  )

  const experts = adversarialReview(agg)
  const topComplaints = topPatterns(agg.complaint_counts, 30)
  const p0 = deriveP0(agg, topComplaints)

  fs.writeFileSync(path.join(OUT, 'SIMULATION_RESULTS.md'), `# SIMULATION RESULTS

**Run ID:** ${agg.run_id}  
**Product version:** ${agg.product.version}  
**Date:** ${new Date().toISOString().slice(0, 10)}

## Milestones (n=${n})

| Day | Retained | Rate |
|-----|----------|------|
| D1 | ${m('d1')} | ${pct(m('d1'), n)} |
| D3 | ${m('d3')} | ${pct(m('d3'), n)} |
| D7 | ${m('d7')} | ${pct(m('d7'), n)} |
| D14 | ${m('d14')} | ${pct(m('d14'), n)} |
| D30 | ${m('d30')} | ${pct(m('d30'), n)} |
| D60 | ${m('d60')} | ${pct(m('d60'), n)} |
| D90 | ${m('d90')} | ${pct(m('d90'), n)} |
| D180 | ${m('d180')} | ${pct(m('d180'), n)} |

## Outcomes

| Metric | Value |
|--------|-------|
| Subscribe | ${pct(subs, n)} (${subs}) |
| Refund | ${refunds} |
| Would recommend | ${pct(recommend, n)} |
| Never activated | ${agg.results.filter(r => r.outcome === 'never_activated').length} |

## Threshold alerts

${topComplaints.slice(0, 15).map(([t, c]) => `- ${thresholdVerdict(c, t)}`).join('\n')}

## Sample quotes

${agg.results.filter((_, i) => i % 50 === 0).slice(0, 10).map(r => `- **#${r.character.id} ${r.character.name}:** ${r.user_quotes[0] ?? '—'}`).join('\n')}
`)

  fs.writeFileSync(path.join(OUT, 'RETENTION_REPORT.md'), `# RETENTION REPORT\n\n${mdList(topPatterns(agg.retention_blockers, 20))}\n\n## D30 blocker\n${thresholdVerdict(m('d1') - m('d30'), 'D1→D30 流失')}\n`)
  fs.writeFileSync(path.join(OUT, 'CONVERSION_REPORT.md'), `# CONVERSION REPORT\n\nSubscribe rate: **${pct(subs, n)}**\n\n${mdList(topPatterns(agg.conversion_blockers, 20))}\n`)
  fs.writeFileSync(path.join(OUT, 'TRUST_REPORT.md'), `# TRUST REPORT\n\n${mdList(topPatterns(agg.trust_counts, 20))}\n\n${mdList(topPatterns(agg.complaint_counts, 15))}\n`)
  fs.writeFileSync(path.join(OUT, 'FRICTION_REPORT.md'), `# FRICTION REPORT\n\n${mdList(topPatterns(agg.friction_counts, 20))}\n\nOnboarding friction score: ${agg.product.onboarding_friction}\n`)
  fs.writeFileSync(path.join(OUT, 'COMPETITOR_SWITCH_REPORT.md'), `# COMPETITOR SWITCH REPORT\n\n${mdList([...agg.competitor_counts.entries()], 15)}\n`)
  fs.writeFileSync(path.join(OUT, 'FOUNDER_BIAS_REPORT.md'), `# FOUNDER BIAS REPORT\n\n| Bias | Reality |\n|------|--------|\n| 科學正確就會付 | D30 ${pct(m('d30'), n)} 仍偏低 |\n| 外食=台灣全部 | 媽媽/自煮 segment 仍 quit |\n| Adherence=完成 | 仍要記食物；tracking haters 流失 |\n| 14天試用夠 | cliff 仍 #1 conversion blocker |\n| 骰子=產品 | MFP 用戶要速度不是組合 |\n\n## Expert board (must disagree)\n\n${experts.map(e => `**${e.role}** (${e.verdict}): ${e.attack}`).join('\n\n')}\n`)

  fs.writeFileSync(path.join(OUT, 'P0_CHANGES.md'), p0.p0)
  fs.writeFileSync(path.join(OUT, 'P1_CHANGES.md'), p0.p1)
  fs.writeFileSync(path.join(OUT, 'P2_CHANGES.md'), p0.p2)

  appendChangelog(agg, p0.p0Title)

  const implemented = path.join(OUT, 'P0_IMPLEMENTED.md')
  if (!fs.existsSync(implemented)) {
    fs.writeFileSync(
      implemented,
      `# P0 Implementation Log\n\nTrack shipped fixes from market-loop P0.\n\n| Date | Change |\n|------|--------|\n| 2026-06-20 | Progress preview after trial · Onboarding 4 steps · Frequent-first log · Family meal mode · Health sync opt-in UI |\n`
    )
  }

  console.log(`✅ Market loop reports → ${OUT}`)
}

function deriveP0(agg: LoopAggregate, complaints: [string, number][]) {
  const p0items = [
    '條碼掃描 + 便利商店快速記（MFP 速度 gap）',
    'Native Apple Health / Health Connect 連線',
    '年繳方案 + 更清楚的價值對比',
    'Home-cook 食譜路徑（媽媽/自煮 segment）',
    'Win-back 幽靈用戶 D30 push',
  ]
  const top = complaints[0]
  if (top && top[1] >= 50) {
    p0items.unshift(`Top blocker: ${top[0]} (${top[1]})`)
  }
  const p0 = `# P0 CHANGES (market-loop ${agg.run_id})\n\n${p0items.map((x, i) => `${i + 1}. ${x}`).join('\n')}\n\n**Gate:** 50+ 同抱怨 → investigate · 100+ → redesign\n`
  const p1 = `# P1 CHANGES\n\n1. 年繳 NT$3990\n2. 條碼掃描（便利商店）\n3. 平台期每週敘事 push\n4. Win-back D30 幽靈用戶\n5. 醫療免責 + 顧問頁\n`
  const p2 = `# P2 CHANGES\n\n1. Foodpanda 整合\n2. 家庭方案\n3. B2B 診所\n4. English UI\n5. Ozempic 追蹤免責模式\n`
  return { p0, p1, p2, p0Title: `market-loop ${agg.run_id}: ${p0items[0]?.slice(0, 40) ?? 'P0 refresh'}` }
}

function appendChangelog(agg: LoopAggregate, title: string) {
  const file = path.join(OUT, 'CHANGELOG.md')
  const entry = `\n## ${new Date().toISOString().slice(0, 10)} — ${agg.run_id}\n\n- Product: \`${agg.product.version}\`\n- D30: ${pct(agg.results.filter(r => r.milestones.d30).length, agg.results.length)}\n- Subscribe: ${pct(agg.results.filter(r => r.outcome === 'subscribed').length, agg.results.length)}\n- Top complaint: ${topPatterns(agg.complaint_counts, 1)[0]?.[0] ?? '—'}\n- ${title}\n`
  if (fs.existsSync(file)) fs.appendFileSync(file, entry)
  else fs.writeFileSync(file, `# Market Loop Changelog\n\nPermanent process — run \`npm run market-loop\` after major product changes.\n${entry}`)
}
