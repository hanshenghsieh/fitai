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

async function loadPurchases() {
  if (!isNativeIOS()) return null
  try {
    const mod = await import('@revenuecat/purchases-capacitor')
    return mod.Purchases
  } catch {
    return null
  }
}

export async function configureAppleIap(userId: string): Promise<boolean> {
  if (!isRevenueCatConfigured() || !isNativeIOS()) return false
  if (configuredForUser === userId) return true

  const Purchases = await loadPurchases()
  const apiKey = getRevenueCatIosApiKey()
  if (!Purchases || !apiKey) return false

  await Purchases.configure({
    apiKey,
    appUserID: userId,
  })
  configuredForUser = userId
  return true
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
  const entitlement = customerInfo.entitlements?.active?.[APPLE_IAP_ENTITLEMENT_ID]
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
  const ready = await configureAppleIap(userId)
  if (!ready) throw new Error('訂閱尚未開放')

  const Purchases = await loadPurchases()
  if (!Purchases) throw new Error('訂閱尚未開放')

  const offerings = await Purchases.getOfferings()
  const pkg = offerings.current?.availablePackages?.[0]
  if (!pkg) throw new Error('找不到訂閱方案，請稍後再試')

  const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg })
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
}

export async function restoreAppleIap(userId: string): Promise<AppleIapPurchaseResult> {
  const ready = await configureAppleIap(userId)
  if (!ready) throw new Error('還原購買尚未開放')

  const Purchases = await loadPurchases()
  if (!Purchases) throw new Error('還原購買尚未開放')

  const { customerInfo } = await Purchases.restorePurchases()
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
}
