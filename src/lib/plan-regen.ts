/** 計畫自動重算 — 體重/體脂變化觸發閉環 */

export const WEIGHT_REGEN_THRESHOLD_KG = 0.5
export const BODY_FAT_REGEN_THRESHOLD_PCT = 1.0

export interface BodySnapshot {
  weight_kg?: number | null
  body_fat_pct?: number | null
}

export interface RegenDecision {
  shouldRegen: boolean
  reason: string | null
  summary: string | null
}

export function evaluateRegenNeed(
  previous: BodySnapshot,
  next: BodySnapshot
): RegenDecision {
  const prevW = previous.weight_kg
  const nextW = next.weight_kg
  const prevBf = previous.body_fat_pct
  const nextBf = next.body_fat_pct

  if (prevW != null && nextW != null) {
    const delta = Math.abs(nextW - prevW)
    if (delta >= WEIGHT_REGEN_THRESHOLD_KG) {
      const dir = nextW < prevW ? '下降' : '上升'
      return {
        shouldRegen: true,
        reason: `weight_change_${dir}`,
        summary: `體重${dir} ${delta.toFixed(1)} kg，已依新數據重算熱量、蛋白質與課表。`,
      }
    }
  }

  if (prevBf != null && nextBf != null) {
    const delta = Math.abs(nextBf - prevBf)
    if (delta >= BODY_FAT_REGEN_THRESHOLD_PCT) {
      return {
        shouldRegen: true,
        reason: 'body_fat_change',
        summary: `體脂變化 ${delta.toFixed(1)}%，已重算你的赤字與蛋白質目標。`,
      }
    }
  }

  return { shouldRegen: false, reason: null, summary: null }
}

export async function triggerPlanRegeneration(
  userId: string,
  reason: string
): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return { ok: false, error: 'CRON_SECRET not configured' }
  }

  try {
    const res = await fetch(`${appUrl}/api/generate-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
        'x-user-id': userId,
      },
      body: JSON.stringify({ regen_reason: reason }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      return { ok: false, error: (json as { error?: string }).error || `HTTP ${res.status}` }
    }
    return { ok: true, data: json }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'regen failed' }
  }
}
