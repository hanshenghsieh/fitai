#!/usr/bin/env npx tsx
/**
 * Nutrition Source Trace — coverage audit (read-only).
 * Exports per-item traces to data/food-kb/nutrition-source-traces.json
 */
import fs from 'fs'
import path from 'path'
import { eatOutMenu } from '@/lib/convenience-store-menu'
import { resolveNutritionTrace, traceCoverageStats } from '@/lib/nutrition/nutrition-source-trace'

const OUT_JSON = path.join(process.cwd(), 'data', 'food-kb', 'nutrition-source-traces.json')
const OUT_MD = path.join(process.cwd(), 'docs', 'NUTRITION_SOURCE_TRACE_REPORT.md')

function main() {
  const stats = traceCoverageStats(eatOutMenu)
  const traces: Record<string, ReturnType<typeof resolveNutritionTrace>> = {}

  for (const item of eatOutMenu) {
    traces[item.id] = resolveNutritionTrace(item)
  }

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true })
  fs.writeFileSync(
    OUT_JSON,
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        policy: 'nutrition_source_trace',
        stats,
        traces,
      },
      null,
      2
    )
  )

  const md = [
    '# Nutrition Source Trace Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Coverage',
    '',
    `| Metric | Value |`,
    `|--------|------:|`,
    `| Total items | ${stats.total} |`,
    `| Explicit nutrition_trace | ${stats.explicit_trace} |`,
    `| Inferred (legacy) | ${stats.inferred_trace} |`,
    `| With provenance | ${stats.with_provenance} |`,
    '',
    '## By source_type',
    '',
    ...Object.entries(stats.by_source_type).map(([k, v]) => `- **${k}**: ${v}`),
    '',
    '## By confidence',
    '',
    ...Object.entries(stats.by_confidence).map(([k, v]) => `- **${k}**: ${v}`),
    '',
    `Full trace index: \`data/food-kb/nutrition-source-traces.json\``,
  ].join('\n')

  fs.mkdirSync(path.dirname(OUT_MD), { recursive: true })
  fs.writeFileSync(OUT_MD, md)

  console.log('\n=== Nutrition Source Trace ===\n')
  console.log(`Items: ${stats.total}`)
  console.log(`Explicit trace: ${stats.explicit_trace}`)
  console.log(`Inferred: ${stats.inferred_trace}`)
  console.log(`\nJSON: ${OUT_JSON}`)
  console.log(`Report: ${OUT_MD}\n`)
}

main()
