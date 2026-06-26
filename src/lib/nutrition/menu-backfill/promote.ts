import type { ConvenienceItem } from '@/lib/convenience-store-menu'
import {
  ingestGovernedRecordsFromStaging,
} from '@/lib/data-governance/coverage-dashboard'
import { validatePromotionTransition } from '@/lib/data-governance/promotion'
import type { GovernedMenuRecord } from '@/lib/data-governance/types'
import { itemVerificationOk } from './verification'
import type { StagingManifest, StagingRestaurant, VerifiedMenuItem } from './types'

export interface PromoteItemResult {
  item_id: string
  store: string
  name: string
  allowed: boolean
  block_reason?: string
}

export interface PromoteRestaurantResult {
  canonical_name: string
  items: PromoteItemResult[]
  promoted_count: number
  blocked_count: number
}

export interface PromotePlan {
  restaurants: PromoteRestaurantResult[]
  runtime_items: ConvenienceItem[]
  governed_records: GovernedMenuRecord[]
  total_promoted: number
  total_blocked: number
}

function normKey(store: string, name: string): string {
  return `${store.trim().toLowerCase()}::${name.trim().toLowerCase()}`
}

function toRuntimeItem(item: VerifiedMenuItem): ConvenienceItem {
  const { verification: _v, ...base } = item
  return {
    ...base,
    source: base.source ?? 'chain',
    role: base.role ?? 'combo',
    portionable: base.portionable ?? false,
    tags: base.tags ?? [],
    description: base.description?.replace(/Sprint\d verified/, 'BDGS promoted') ?? base.description,
  }
}

export function buildPromotePlan(
  manifest: StagingManifest,
  opts: { founder_approved: boolean; actor?: string; now?: string }
): PromotePlan {
  const actor = opts.actor ?? 'founder'
  const now = opts.now ?? new Date().toISOString()
  const governed = ingestGovernedRecordsFromStaging(manifest)
  const govById = new Map(governed.map(r => [r.record_id, r]))

  const restaurants: PromoteRestaurantResult[] = []
  const runtime_items: ConvenienceItem[] = []

  for (const restaurant of manifest.restaurants) {
    if (restaurant.status !== 'production_candidate') continue

    const itemResults: PromoteItemResult[] = []
    let promoted_count = 0
    let blocked_count = 0

    for (const item of restaurant.items) {
      const iv = itemVerificationOk(item)
      const conf = item.verification?.confidence
      const ab = conf === 'A' || conf === 'B'

      const record = govById.get(item.id)
      const transition = record
        ? validatePromotionTransition({
            record,
            to_stage: 'runtime',
            actor,
            reason: 'Founder approved promotion',
            founder_approved: opts.founder_approved,
            pending_review: item.verification?.conflict_status === 'pending_review',
          })
        : null

      const allowed =
        iv.ok &&
        ab &&
        Boolean(transition?.allowed) &&
        item.verification?.conflict_status !== 'pending_review'

      const block_reason = !iv.ok
        ? iv.reasons.join('; ')
        : !ab
          ? `confidence ${conf ?? 'missing'}`
          : transition && !transition.allowed
            ? transition.block_reason
            : undefined

      itemResults.push({
        item_id: item.id,
        store: item.store,
        name: item.name,
        allowed,
        block_reason,
      })

      if (allowed) {
        promoted_count++
        runtime_items.push(toRuntimeItem(item))
      } else {
        blocked_count++
      }
    }

    restaurants.push({
      canonical_name: restaurant.canonical_name,
      items: itemResults,
      promoted_count,
      blocked_count,
    })
  }

  const total_promoted = runtime_items.length
  const total_blocked = restaurants.reduce((n, r) => n + r.blocked_count, 0)

  return {
    restaurants,
    runtime_items,
    governed_records: governed,
    total_promoted,
    total_blocked,
  }
}

export function markManifestPromoted(
  manifest: StagingManifest,
  promotedIds: Set<string>,
  at: string
): StagingManifest {
  const restaurants = manifest.restaurants.map(r => {
    if (r.status !== 'production_candidate') return r
    const promoted = r.items.filter(i => promotedIds.has(i.id))
    if (!promoted.length) return r
    const allPromoted = r.items.every(i => promotedIds.has(i.id))
    return {
      ...r,
      status: allPromoted ? ('promoted' as StagingRestaurant['status']) : r.status,
      promoted_at: at,
      promoted_item_count: promoted.length,
    }
  })
  return {
    ...manifest,
    generated_at: at,
    restaurants,
  }
}

export function mergePromotedIntoRuntime(
  base: ConvenienceItem[],
  promoted: ConvenienceItem[]
): { merged: ConvenienceItem[]; replaced: number; added: number } {
  const promotedByKey = new Map(promoted.map(i => [normKey(i.store, i.name), i]))
  const promotedIds = new Set(promoted.map(i => i.id))
  const seen = new Set<string>()
  let replaced = 0
  let added = 0

  const merged: ConvenienceItem[] = []
  for (const item of base) {
    const key = normKey(item.store, item.name)
    const override = promotedByKey.get(key)
    if (override) {
      merged.push({ ...item, ...override, id: override.id })
      seen.add(key)
      replaced++
    } else if (!promotedIds.has(item.id)) {
      merged.push(item)
    }
  }

  for (const item of promoted) {
    const key = normKey(item.store, item.name)
    if (!seen.has(key)) {
      merged.push(item)
      seen.add(key)
      added++
    }
  }

  return { merged, replaced, added }
}
