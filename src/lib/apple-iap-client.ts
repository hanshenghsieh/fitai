'use client'

import { Capacitor } from '@capacitor/core'
import { Purchases } from '@revenuecat/purchases-capacitor'
import { isNativeIOS } from '@/lib/capacitor-native'
import {
  APPLE_IAP_ENTITLEMENT_ID,
  APPLE_IAP_PRODUCT_ID,
  getRevenueCatIosApiKey,
  isRevenueCatConfigured,
} from '@/lib/apple-iap-config'
import { apiFetch } from '@/lib/api/client'

export interface AppleIapPurchaseResult {
  active: boolean
  originalTransactionId?: string
  productId?: string
  expiresAt?: string | null
}

export type AppleIapPurchaseStep = 'configure' | 'offerings' | 'purchase' | 'sync'

let configuredForUser: string | null = null

const PLUGIN_PROBE_TIMEOUT_MS = 4_000
const CONFIGURE_TIMEOUT_MS = 15_000
const OFFERINGS_TIMEOUT_MS = 20_000
const PURCHASE_SHEET_TIMEOUT_MS = 90_000

export function resetAppleIapConfiguration(): void {
  configuredForUser = null
}

export function isPurchasesNativePluginAvailable(): boolean {
  return isNativeIOS() && Capacitor.isPluginAvailable('Purchases')
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

function ascProductUnavailableError(): Error {
  return new Error(
    'Apple 抓不到訂閱商品 betterbit_pro_monthly。請到 App Store Connect 確認：① 付費 App 協議已生效 ② 訂閱已設價格+本地化 ③ Product ID 完全一致。新建商品可能需等數小時。'
  )
}

function humanizePurchaseError(err: unknown): Error {
  if (!(err instanceof Error)) return new Error('無法完成訂閱')
  const msg = err.message || ''
  if (/cancel/i.test(msg) || /PurchaseCancelledError/i.test(msg) || /user cancelled/i.test(msg)) {
    return new Error('已取消購買')
  }
  if (
    /could not be fetched from App Store Connect|offerings empty|why-are-offerings-empty|issue with your configuration|ConfigurationError|None of the products registered/i.test(
      msg
    )
  ) {
    return ascProductUnavailableError()
  }
  if (/ProductNotAvailable|not available|PRODUCT_NOT_AVAILABLE|products not found/i.test(msg)) {
    return ascProductUnavailableError()
  }
  if (/network|offline|timed out|timeout|逾時/i.test(msg)) {
    return returnTimeoutMessage(msg)
  }
  if (/row-level security|violates row-level security/i.test(msg)) {
    return new Error('會員狀態同步失敗。請按「還原購買」重試，無需再付費')
  }
  if (/plugin|unimplemented|not implemented|Web not supported|web/i.test(msg)) {
    return new Error('付款模組未載入。請安裝 TestFlight Build 13（Mac 需跑 testflight:prep 後 Archive）')
  }
  return err
}

function returnTimeoutMessage(msg: string): Error {
  if (msg.includes('逾時') || msg.includes('超时')) return new Error(msg)
  return new Error('操作逾時。請確認已登入 Sandbox，並安裝最新 TestFlight Build')
}

function assertNativePurchaseEnvironment(): void {
  if (!isNativeIOS()) {
    throw new Error('請在 iPhone App 內訂閱，不要用瀏覽器')
  }
  if (!Capacitor.isNativePlatform()) {
    throw new Error('付款模組未載入。請在 iPhone App 內操作')
  }
  if (!isPurchasesNativePluginAvailable()) {
    throw new Error(
      '付款原生模組未安裝。Mac 請執行 npm run testflight:prep 後重新 Archive 上傳 Build 13'
    )
  }
}

async function probePurchasesPlugin(): Promise<void> {
  await withTimeout(
    Purchases.isConfigured(),
    PLUGIN_PROBE_TIMEOUT_MS,
    '付款模組無回應。請安裝 TestFlight Build 13（含 RevenueCat 原生插件）'
  )
}

export async function configureAppleIap(userId: string): Promise<boolean> {
  if (!isRevenueCatConfigured() || !isNativeIOS()) return false
  if (configuredForUser === userId) return true

  const apiKey = getRevenueCatIosApiKey()
  if (!apiKey) return false

  assertNativePurchaseEnvironment()

  try {
    await probePurchasesPlugin()

    if (configuredForUser == null) {
      await withTimeout(
        Purchases.configure({ apiKey, appUserID: userId }),
        CONFIGURE_TIMEOUT_MS,
        '初始化付款逾時。Mac Archive 前請跑 npm run testflight:prep，並確認 Xcode 已開 In-App Purchase'
      )
    } else {
      await withTimeout(
        Purchases.logIn({ appUserID: userId }),
        CONFIGURE_TIMEOUT_MS,
        '切換付款帳號逾時，請重試'
      )
    }

    const status = await withTimeout(
      Purchases.isConfigured(),
      PLUGIN_PROBE_TIMEOUT_MS,
      '付款模組初始化後無回應。請安裝 TestFlight Build 13'
    )
    if (!status.isConfigured) {
      throw new Error('付款模組初始化失敗。請安裝最新 TestFlight Build')
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
  const res = await apiFetch('/api/apple-iap/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-betterbit-platform': 'ios',
    },
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

type PurchasesClient = typeof Purchases

type PurchaseTarget =
  | { kind: 'package'; value: { identifier: string; product: { identifier: string } } }
  | { kind: 'product'; value: { identifier: string } }

async function resolvePurchaseTarget(Purchases: PurchasesClient): Promise<PurchaseTarget> {
  const productId = APPLE_IAP_PRODUCT_ID

  // Prefer direct StoreKit product fetch — avoids RevenueCat offerings config error spam.
  const direct = await withTimeout(
    Purchases.getProducts({ productIdentifiers: [productId] }),
    OFFERINGS_TIMEOUT_MS,
    '讀取 App Store 商品逾時。請確認 Sandbox 已登入'
  )
  const fromDirect = direct.products?.[0]
  if (fromDirect?.identifier) {
    return { kind: 'product', value: fromDirect }
  }

  try {
    const offerings = await withTimeout(
      Purchases.getOfferings(),
      OFFERINGS_TIMEOUT_MS,
      '讀取訂閱方案逾時。請確認 RevenueCat Offering 已設 Current'
    )
    const fromOffering =
      offerings.current?.availablePackages?.find(pkg => pkg.product?.identifier === productId) ??
      offerings.current?.availablePackages?.[0]
    if (fromOffering?.product?.identifier) {
      return { kind: 'package', value: fromOffering }
    }
  } catch (err) {
    throw humanizePurchaseError(err)
  }

  throw ascProductUnavailableError()
}

async function executePurchase(Purchases: PurchasesClient, target: PurchaseTarget) {
  if (target.kind === 'package') {
    return withTimeout(
      Purchases.purchasePackage({ aPackage: toNativePayload(target.value) }),
      PURCHASE_SHEET_TIMEOUT_MS,
      '等待 Apple 付款逾時。請到「設定 → 開發人員 → Sandbox」登入測試帳號後重試'
    )
  }

  return withTimeout(
    Purchases.purchaseStoreProduct({ product: toNativePayload(target.value) }),
    PURCHASE_SHEET_TIMEOUT_MS,
    '等待 Apple 付款逾時。請到「設定 → 開發人員 → Sandbox」登入測試帳號後重試'
  )
}

export async function getAppleIapStatus(userId: string): Promise<AppleIapPurchaseResult> {
  const ready = await configureAppleIap(userId)
  if (!ready) return { active: false }

  const { customerInfo } = await withTimeout(
    Purchases.getCustomerInfo(),
    OFFERINGS_TIMEOUT_MS,
    '讀取會員狀態逾時'
  )
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

    onStep?.('offerings')
    const target = await resolvePurchaseTarget(Purchases)

    onStep?.('purchase')
    const purchaseResult = await executePurchase(Purchases, target)
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
