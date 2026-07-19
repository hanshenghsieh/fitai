import { NextRequest } from 'next/server'
import { requireApiUser } from '@/lib/api/auth'
import { handleCorsOptions, jsonWithCors } from '@/lib/api/cors'
import {
  normalizeOpenFoodFactsProduct,
  OPEN_FOOD_FACTS_FIELDS,
  validateGtin,
  type OpenFoodFactsResponse,
} from '@/lib/barcode-food'

export const maxDuration = 15

const LOOKUP_TIMEOUT_MS = 8_000

export async function OPTIONS(request: NextRequest) {
  return handleCorsOptions(request)
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ gtin: string }> }
) {
  const auth = await requireApiUser(request)
  if (!auth.ok) return auth.response

  const { gtin: rawGtin } = await context.params
  const validation = validateGtin(rawGtin)
  if (!validation.valid) {
    return jsonWithCors(
      { ok: false, code: 'INVALID_GTIN', error: '條碼格式或檢查碼不正確。' },
      request,
      { status: 400 }
    )
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS)
  try {
    const url =
      `https://world.openfoodfacts.org/api/v2/product/${validation.gtin}.json` +
      `?fields=${encodeURIComponent(OPEN_FOOD_FACTS_FIELDS)}`
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'BetterBit/1.0 (https://www.betterbit.app)',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return jsonWithCors(
        { ok: false, code: 'LOOKUP_FAILED', error: '食品資料服務暫時無法使用。' },
        request,
        { status: 502 }
      )
    }

    const payload = (await response.json()) as OpenFoodFactsResponse
    if (payload.status !== 1 || !payload.product) {
      return jsonWithCors(
        { ok: false, code: 'NOT_FOUND', error: 'Open Food Facts 找不到這個條碼。' },
        request,
        { status: 404 }
      )
    }

    const item = normalizeOpenFoodFactsProduct(validation.gtin, payload.product)
    if (!item) {
      return jsonWithCors(
        {
          ok: false,
          code: 'INCOMPLETE_PRODUCT',
          error: '找到商品，但名稱或每 100g/ml 營養資料不完整。',
        },
        request,
        { status: 422 }
      )
    }

    return jsonWithCors({ ok: true, barcode: validation.gtin, item }, request)
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError'
    return jsonWithCors(
      {
        ok: false,
        code: timedOut ? 'TIMEOUT' : 'LOOKUP_FAILED',
        error: timedOut ? '食品資料查詢逾時，請再試一次。' : '無法連線到食品資料服務。',
      },
      request,
      { status: timedOut ? 504 : 502 }
    )
  } finally {
    clearTimeout(timer)
  }
}
