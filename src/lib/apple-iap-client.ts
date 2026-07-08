'use client'

import { isNativeIOS } from '@/lib/capacitor-native'
import {
  APPLE_IAP_ENTITLEMENT_ID,
  getRevenueCatIosApiKey,
  isRevenueCatConfigured,
} from '@/lib/apple-iap-config'

export interface AppleIapPurchaseResult {
  active: boolean
  originalTransactionId?: string
  productId?: string
  expiresAt?: string | null
}

let configuredForUser: string | null = null

const OFFERINGS_TIMEOUT_MS = 25_000
const PURCHASE_SHEET_TIMEOUT_MS = 120_000

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

function humanizePurchaseError(err: unknown): Error {
  if (!(err instanceof Error)) return new Error('無法完成訂閱')
  const msg = err.message || ''
  if (/cancel/i.test(msg) || /PurchaseCancelledError/i.test(msg) || /user cancelled/i.test(msg)) {
    return new Error('已取消購買')
  }
  if (/ProductNotAvailable|not available|PRODUCT_NOT_AVAILABLE/i.test(msg)) {
    return new Error('App Store 商品尚未可用，請稍後再試，或確認已用 Sandbox 帳號')
  }
  if (/network|offline|timed out|timeout|逾時/i.test(msg)) {
    return new Error(msg.includes('逾時') ? msg : '網路不穩，請稍後再試')
  }
  if (/plugin|unimplemented|not implemented|web/i.test(msg)) {
    return new Error('此 TestFlight 版尚未包含付款模組，請更新到最新 Build 後再試')
  }
  return err
}

export async function configureAppleIap(userId: string): Promise<boolean> {
  if (!isRevenueCatConfigured() || !isNativeIOS()) return false
  if (configuredForUser === userId) return true

  const Purchases = await loadPurchases()
  const apiKey = getRevenueCatIosApiKey()
  if (!Purchases || !apiKey) return false

  try {
    if (configuredForUser == null) {
      await Purchases.configure({
        apiKey,
        appUserID: userId,
      })
    } else {
      await Purchases.logIn({ appUserID: userId })
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
    active[APPLE_IAP_ENTITLEMENT_ID] ??
    // Fallback: any active entitlement if env id mismatches dashboard.
    Object.values(active)[0]

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

export async function purchaseAppleIap(userId: string): Promise<AppleIapPurchaseResult> {
  try {
    const ready = await configureAppleIap(userId)
    if (!ready) throw new Error('訂閱尚未開放')

    const Purchases = await loadPurchases()
    if (!Purchases) throw new Error('此 TestFlight 版尚未包含付款模組，請更新到最新 Build 後再試')

    const offerings = await withTimeout(
      Purchases.getOfferings(),
      OFFERINGS_TIMEOUT_MS,
      '讀取訂閱方案逾時。請確認網路，並到「設定 → 開發人員 → Sandbox」登入測試帳號後再試'
    )
    const pkg = offerings.current?.availablePackages?.[0]
    if (!pkg) {
      throw new Error(
        '找不到訂閱方案。請到 RevenueCat 確認 Current Offering 已綁 betterbit_pro_monthly'
      )
    }

    const storeProduct = pkg.product
    if (storeProduct?.identifier) {
      const purchaseResult = await withTimeout(
        Purchases.purchaseStoreProduct({ product: storeProduct }),
        PURCHASE_SHEET_TIMEOUT_MS,
        '付款畫面逾時。請確認已登入 Sandbox，並在真機重試'
      )
      const entitlement = readEntitlement(purchaseResult.customerInfo)
      if (!entitlement?.originalTransactionId) {
        throw new Error('購買未完成')
      }
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
    }

    const { customerInfo } = await withTimeout(
      Purchases.purchasePackage({ aPackage: pkg }),
      PURCHASE_SHEET_TIMEOUT_MS,
      '付款畫面逾時。請確認已登入 Sandbox，並在真機重試'
    )
    const entitlement = readEntitlement(customerInfo)
    if (!entitlement?.originalTransactionId) {
      throw new Error('購買未完成')
    }

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
    if (!Purchases) throw new Error('此 TestFlight 版尚未包含付款模組，請更新到最新 Build 後再試')

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
