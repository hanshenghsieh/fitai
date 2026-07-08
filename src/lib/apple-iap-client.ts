'use client'

import { Capacitor } from '@capacitor/core'
import { isNativeIOS } from '@/lib/capacitor-native'
import {
  APPLE_IAP_ENTITLEMENT_ID,
  APPLE_IAP_PRODUCT_ID,
  getRevenueCatIosApiKey,
  isRevenueCatConfigured,
} from '@/lib/apple-iap-config'

export interface AppleIapPurchaseResult {
  active: boolean
  originalTransactionId?: string
  productId?: string
  expiresAt?: string | null
}

export type AppleIapPurchaseStep = 'configure' | 'offerings' | 'purchase' | 'sync'

let configuredForUser: string | null = null

const CONFIGURE_TIMEOUT_MS = 15_000
const OFFERINGS_TIMEOUT_MS = 20_000
const PURCHASE_SHEET_TIMEOUT_MS = 60_000

export function resetAppleIapConfiguration(): void {
  configuredForUser = null
}

async function loadPurchases() {
  if (!isNativeIOS()) return null
  try {
    const mod = await import('@revenuecat/purchases-capacitor')
    return mod.Purchases
  } catch {
    return null
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms)
    promise.then(
      value => {
        clearTimeout(timer)
        resolve(value)
      },
      err => {
        clearTimeout(timer)
        reject(err)
      }
    )
  })
}

/** Strip proxies / non-serializable fields before Capacitor native bridge. */
function toNativePayload<T>(value: T): T {
  try {
    return JSON.parse(JSON.stringify(value)) as T
  } catch {
    return value
  }
}

function humanizePurchaseError(err: unknown): Error {
  if (!(err instanceof Error)) return new Error('無法完成訂閱')
  const msg = err.message || ''
  if (/cancel/i.test(msg) || /PurchaseCancelledError/i.test(msg) || /user cancelled/i.test(msg)) {
    return new Error('已取消購買')
  }
  if (/ProductNotAvailable|not available|PRODUCT_NOT_AVAILABLE|products not found/i.test(msg)) {
    return new Error('App Store 商品尚未可用。請確認 ASC 有 betterbit_pro_monthly，並用 Sandbox 帳號')
  }
  if (/network|offline|timed out|timeout|逾時/i.test(msg)) {
    return returnTimeoutMessage(msg)
  }
  if (/plugin|unimplemented|not implemented|Web not supported|web/i.test(msg)) {
    return new Error('付款模組未載入。請安裝 TestFlight 最新 Build（含 RevenueCat），不是只更新網頁')
  }
  return err
}

function returnTimeoutMessage(msg: string): Error {
  if (msg.includes('逾時') || msg.includes('超时')) return new Error(msg)
  return new Error('操作逾時。請確認已登入 Sandbox，並安裝最新 TestFlight Build')
}

async function assertNativePurchasesBridge(Purchases: NonNullable<Awaited<ReturnType<typeof loadPurchases>>>): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    throw new Error('付款模組未載入。請在 iPhone App 內操作，不要用 Safari')
  }
  try {
    await withTimeout(
      Purchases.getAppUserID(),
      8_000,
      '付款模組無回應。請安裝最新 TestFlight Build（需含 RevenueCat 原生插件）'
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (/Web not supported|not implemented|unimplemented/i.test(msg)) {
      throw new Error('付款模組未載入。Mac 需重新 Archive 上傳含 RevenueCat 的 Build')
    }
    throw err
  }
}

export async function configureAppleIap(userId: string): Promise<boolean> {
  if (!isRevenueCatConfigured() || !isNativeIOS()) return false
  if (configuredForUser === userId) return true

  const Purchases = await loadPurchases()
  const apiKey = getRevenueCatIosApiKey()
  if (!Purchases || !apiKey) return false

  try {
    await assertNativePurchasesBridge(Purchases)
    if (configuredForUser == null) {
      await withTimeout(
        Purchases.configure({ apiKey, appUserID: userId }),
        CONFIGURE_TIMEOUT_MS,
        '初始化付款逾時。請安裝最新 TestFlight Build 後重試'
      )
    } else {
      await withTimeout(
        Purchases.logIn({ appUserID: userId }),
        CONFIGURE_TIMEOUT_MS,
        '切換付款帳號逾時，請重試'
      )
    }
    configuredForUser = userId
    return true
  } catch (err) {
    configuredForUser = null
    throw humanizePurchaseError(err)
  }
}

function readEntitlement(customerInfo: {
  entitlements?: {
    active?: Record<
      string,
      {
        productIdentifier?: string
        expirationDate?: string | null
        originalPurchaseDate?: string | null
      }
    >
  }
}) {
  const active = customerInfo.entitlements?.active ?? {}
  const entitlement =
    active[APPLE_IAP_ENTITLEMENT_ID] ?? Object.values(active)[0]

  if (!entitlement?.productIdentifier) return null

  const originalTransactionId = `${entitlement.productIdentifier}_${entitlement.originalPurchaseDate ?? 'active'}`

  return {
    productId: entitlement.productIdentifier,
    expiresAt: entitlement.expirationDate ?? null,
    originalTransactionId,
  }
}

async function syncToBackend(payload: {
  originalTransactionId: string
  productId?: string
  expiresAt?: string | null
  isRestore?: boolean
}) {
  const res = await fetch('/api/apple-iap/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      originalTransactionId: payload.originalTransactionId,
      productId: payload.productId,
      expiresAt: payload.expiresAt,
      isRestore: payload.isRestore,
    }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || '無法同步訂閱狀態')
  }
}

type PurchasesClient = NonNullable<Awaited<ReturnType<typeof loadPurchases>>>

async function resolveStoreProduct(Purchases: PurchasesClient) {
  const productId = APPLE_IAP_PRODUCT_ID

  const direct = await withTimeout(
    Purchases.getProducts({ productIdentifiers: [productId] }),
    OFFERINGS_TIMEOUT_MS,
    '讀取 App Store 商品逾時。請確認 Sandbox 已登入'
  )
  const fromDirect = direct.products?.[0]
  if (fromDirect?.identifier) return fromDirect

  const offerings = await withTimeout(
    Purchases.getOfferings(),
    OFFERINGS_TIMEOUT_MS,
    '讀取訂閱方案逾時。請確認 RevenueCat Offering 已設 Current'
  )
  const pkg = offerings.current?.availablePackages?.[0]
  if (pkg?.product?.identifier) return pkg.product

  throw new Error(
    `找不到商品 ${productId}。請確認 App Store Connect + RevenueCat Offering`
  )
}

async function purchaseStoreProduct(
  Purchases: PurchasesClient,
  product: { identifier: string }
) {
  const nativeProduct = toNativePayload(product)
  const purchaseResult = await withTimeout(
    Purchases.purchaseStoreProduct({ product: nativeProduct }),
    PURCHASE_SHEET_TIMEOUT_MS,
    '等待 Apple 付款逾時。請到「設定 → 開發人員 → Sandbox」登入測試帳號後重試'
  )
  return purchaseResult
}

export async function getAppleIapStatus(userId: string): Promise<AppleIapPurchaseResult> {
  const ready = await configureAppleIap(userId)
  if (!ready) return { active: false }

  const Purchases = await loadPurchases()
  if (!Purchases) return { active: false }

  const { customerInfo } = await Purchases.getCustomerInfo()
  const entitlement = readEntitlement(customerInfo)
  if (!entitlement?.originalTransactionId) return { active: false }

  return {
    active: true,
    originalTransactionId: entitlement.originalTransactionId,
    productId: entitlement.productId,
    expiresAt: entitlement.expiresAt,
  }
}

export async function purchaseAppleIap(
  userId: string,
  onStep?: (step: AppleIapPurchaseStep) => void
): Promise<AppleIapPurchaseResult> {
  try {
    onStep?.('configure')
    const ready = await configureAppleIap(userId)
    if (!ready) throw new Error('訂閱尚未開放')

    const Purchases = await loadPurchases()
    if (!Purchases) {
      throw new Error('付款模組未載入。請安裝最新 TestFlight Build')
    }

    onStep?.('offerings')
    const storeProduct = await resolveStoreProduct(Purchases)

    onStep?.('purchase')
    const purchaseResult = await purchaseStoreProduct(Purchases, storeProduct)
    const entitlement = readEntitlement(purchaseResult.customerInfo)
    if (!entitlement?.originalTransactionId) {
      throw new Error('購買未完成')
    }

    onStep?.('sync')
    await syncToBackend({
      originalTransactionId: entitlement.originalTransactionId,
      productId: entitlement.productId,
      expiresAt: entitlement.expiresAt,
    })

    return {
      active: true,
      originalTransactionId: entitlement.originalTransactionId,
      productId: entitlement.productId,
      expiresAt: entitlement.expiresAt,
    }
  } catch (err) {
    throw humanizePurchaseError(err)
  }
}

export async function restoreAppleIap(userId: string): Promise<AppleIapPurchaseResult> {
  try {
    const ready = await configureAppleIap(userId)
    if (!ready) throw new Error('還原購買尚未開放')

    const Purchases = await loadPurchases()
    if (!Purchases) throw new Error('付款模組未載入。請安裝最新 TestFlight Build')

    const { customerInfo } = await withTimeout(
      Purchases.restorePurchases(),
      OFFERINGS_TIMEOUT_MS,
      '還原逾時，請稍後再試'
    )
    const entitlement = readEntitlement(customerInfo)
    if (!entitlement?.originalTransactionId) {
      return { active: false }
    }

    await syncToBackend({
      originalTransactionId: entitlement.originalTransactionId,
      productId: entitlement.productId,
      expiresAt: entitlement.expiresAt,
      isRestore: true,
    })

    return {
      active: true,
      originalTransactionId: entitlement.originalTransactionId,
      productId: entitlement.productId,
      expiresAt: entitlement.expiresAt,
    }
  } catch (err) {
    throw humanizePurchaseError(err)
  }
}
