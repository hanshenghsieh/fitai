#!/usr/bin/env npx tsx
import { generateHumans } from './generators'
import { PRODUCT_ITERATIONS, simulateAll } from './simulate'
import { writeReports } from './reports'

const humans = generateHumans(500, 42)
const iterations = PRODUCT_ITERATIONS.map(product => ({
  product,
  agg: simulateAll(humans, product),
}))

const final = iterations[iterations.length - 1]!
console.log('Iteration results:')
for (const { product, agg } of iterations) {
  console.log(
    `  iter ${product.iteration}: D30=${((agg.d30 / agg.n) * 100).toFixed(1)}% sub=${((agg.subscribed / agg.n) * 100).toFixed(1)}% recommend=${((agg.would_recommend / agg.n) * 100).toFixed(1)}%`
  )
}

writeReports(humans, final.agg, iterations)
