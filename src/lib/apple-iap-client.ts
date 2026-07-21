'use client'

import { Capacitor } from '@capacitor/core'
import {
  INTRO_ELIGIBILITY_STATUS,
  Purchases,
  type IntroEligibility,
  type PurchasesPackage,
} from '@revenuecat/purchases-capacitor'
import { isNativeIOS } from '@/lib/capacitor-native'
import {
  APPLE_IAP_ENTITLEMENT_ID,
  APPLE_IAP_ANNUAL_PACKAGE_ID,
  APPLE_IAP_ANNUAL_PRODUCT_ID,
  APPLE_IAP_MONTHLY_PACKAGE_ID,
  APPLE_IAP_MONTHLY_PRODUCT_ID,
  APPLE_IAP_OFFERING_ID,
  isSupportedAppleIapProductId,
  type AppleIapProductId,
  getRevenueCatIosApiKey,
  isRevenueCatConfigured,
} from '@/lib/apple-iap-config'
import { apiFetch } from '@/lib/api/client'

export interface AppleIapPurchaseResult {
  active: boolean
  productId?: string
  expiresAt?: string | null
  backendSynced?: boolean
}

export type AppleIapPurchaseStep = 'configure' | 'offerings' | 'purchase' | 'sync'

export class AppleIapCancelledError extends Error {
  constructor() {
    super('已取消購買')
    this.name = 'AppleIapCancelledError'
  }
}

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
    'Apple 抓不到目前的訂閱方案。請確認 RevenueCat default Offering、App Store 商品價格與本地化均已生效。'
  )
}

export function isAppleIapCancellation(err: unknown): boolean {
  if (err instanceof AppleIapCancelledError) return true
  const record =
    err != null && typeof err === 'object' ? (err as Record<string, unknown>) : null
  const message = err instanceof Error ? err.message : String(record?.message ?? '')
  return (
    record?.userCancelled === true ||
    /cancel|PurchaseCancelledError|user cancelled|已取消/i.test(message)
  )
}

function humanizePurchaseError(err: unknown): Error {
  if (isAppleIapCancellation(err)) return new AppleIapCancelledError()
  if (!(err instanceof Error)) return new Error('無法完成訂閱')
  const msg = err.message || ''
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

async function probePurchasesPlugin(): Promise<{ isConfigured: boolean }> {
  return withTimeout(
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
    const currentStatus = await probePurchasesPlugin()

    if (!currentStatus.isConfigured) {
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

export async function logOutAppleIap(): Promise<void> {
  configuredForUser = null
  if (!isRevenueCatConfigured() || !isNativeIOS() || !isPurchasesNativePluginAvailable()) {
    return
  }

  const status = await probePurchasesPlugin()
  if (!status.isConfigured) return
  await withTimeout(
    Purchases.logOut(),
    CONFIGURE_TIMEOUT_MS,
    '登出付款帳號逾時，請重新啟動 App 後再試'
  )
}

interface RevenueCatCustomerInfoLike {
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
}

interface ActiveAppleIapEntitlement {
  productId: AppleIapProductId
  expiresAt: string | null
}

export function readAppleIapEntitlement(
  customerInfo: RevenueCatCustomerInfoLike
): ActiveAppleIapEntitlement | null {
  const active = customerInfo.entitlements?.active ?? {}
  const entitlement = active[APPLE_IAP_ENTITLEMENT_ID]

  if (!isSupportedAppleIapProductId(entitlement?.productIdentifier)) return null

  return {
    productId: entitlement.productIdentifier,
    expiresAt: entitlement.expirationDate ?? null,
  }
}

function readAndLogEntitlement(
  customerInfo: RevenueCatCustomerInfoLike,
  source: 'purchase' | 'restore' | 'refresh'
): ActiveAppleIapEntitlement | null {
  const activeIds = Object.keys(customerInfo.entitlements?.active ?? {})
  const entitlement = readAppleIapEntitlement(customerInfo)
  console.info('[IAP_CUSTOMER_INFO]', {
    source,
    activeEntitlementIds: activeIds,
    premiumEntitlementPresent: activeIds.includes(APPLE_IAP_ENTITLEMENT_ID),
  })
  console.info('[IAP_ENTITLEMENT_STATUS]', {
    source,
    entitlementId: APPLE_IAP_ENTITLEMENT_ID,
    active: entitlement != null,
    expectedProduct: entitlement != null,
    expirationPresent: Boolean(entitlement?.expiresAt),
  })
  return entitlement
}

async function syncToBackend(isRestore = false): Promise<AppleIapPurchaseResult> {
  console.info('[IAP_VERIFY_REQUEST]', {
    endpoint: '/api/apple-iap/sync',
    isRestore,
  })
  const res = await apiFetch('/api/apple-iap/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-betterbit-platform': 'ios',
    },
    body: JSON.stringify({ isRestore }),
  })
  const data = await res.json().catch(() => ({}))
  console.info('[IAP_VERIFY_RESPONSE]', {
    status: res.status,
    ok: res.ok,
    verified: data.verified === true,
    active: data.active === true,
    productMatches: isSupportedAppleIapProductId(data.product_id),
  })
  if (!res.ok) {
    throw new Error(data.error || '無法同步訂閱狀態')
  }
  if (
    data.verified !== true ||
    data.active !== true ||
    !isSupportedAppleIapProductId(data.product_id)
  ) {
    throw new Error('訂閱尚未通過伺服器驗證，請稍後使用「恢復購買」重試')
  }
  return {
    active: true,
    productId: data.product_id,
    expiresAt: data.subscription?.current_period_end ?? null,
  }
}

export async function finalizeActiveAppleIapEntitlement(
  entitlement: ActiveAppleIapEntitlement,
  syncBackend: () => Promise<AppleIapPurchaseResult>
): Promise<AppleIapPurchaseResult> {
  try {
    const synced = await syncBackend()
    return {
      active: true,
      productId: entitlement.productId,
      expiresAt: entitlement.expiresAt,
      backendSynced: synced.active,
    }
  } catch {
    console.warn('[IAP_VERIFY_RESPONSE]', {
      ok: false,
      optionalSyncFailed: true,
      entitlementStillActive: true,
    })
    return {
      active: true,
      productId: entitlement.productId,
      expiresAt: entitlement.expiresAt,
      backendSynced: false,
    }
  }
}

export interface AppleIapPackageOption {
  plan: 'monthly' | 'yearly'
  packageIdentifier: typeof APPLE_IAP_MONTHLY_PACKAGE_ID | typeof APPLE_IAP_ANNUAL_PACKAGE_ID
  productId: AppleIapProductId
  localizedPrice: string
  price: number
  currencyCode: string
  localizedPricePerMonth: string | null
  hasEligible14DayTrial: boolean
  nativePackage: PurchasesPackage
}

export interface AppleIapOffering {
  identifier: typeof APPLE_IAP_OFFERING_ID
  monthly: AppleIapPackageOption | null
  annual: AppleIapPackageOption | null
}

function isFourteenDayPeriod(aPackage: PurchasesPackage): boolean {
  const intro = aPackage.product.introPrice
  if (!intro || intro.price !== 0 || intro.cycles < 1) return false
  return (
    intro.period === 'P14D' ||
    intro.period === 'P2W' ||
    (intro.periodUnit === 'DAY' && intro.periodNumberOfUnits === 14) ||
    (intro.periodUnit === 'WEEK' && intro.periodNumberOfUnits === 2)
  )
}

export function hasEligibleFourteenDayTrial(
  aPackage: PurchasesPackage,
  eligibility?: IntroEligibility
): boolean {
  return (
    isFourteenDayPeriod(aPackage) &&
    eligibility?.status ===
      INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE
  )
}

function packageOption(
  plan: AppleIapPackageOption['plan'],
  aPackage: PurchasesPackage | null | undefined,
  expectedPackageId: AppleIapPackageOption['packageIdentifier'],
  expectedProductId: AppleIapProductId,
  eligibility: Record<string, IntroEligibility>
): AppleIapPackageOption | null {
  if (
    !aPackage ||
    aPackage.identifier !== expectedPackageId ||
    aPackage.product.identifier !== expectedProductId
  ) {
    return null
  }
  return {
    plan,
    packageIdentifier: expectedPackageId,
    productId: expectedProductId,
    localizedPrice: aPackage.product.priceString,
    price: aPackage.product.price,
    currencyCode: aPackage.product.currencyCode,
    localizedPricePerMonth: aPackage.product.pricePerMonthString,
    hasEligible14DayTrial: hasEligibleFourteenDayTrial(
      aPackage,
      eligibility[expectedProductId]
    ),
    nativePackage: aPackage,
  }
}

export async function getAppleIapOffering(
  userId: string
): Promise<AppleIapOffering> {
  const ready = await configureAppleIap(userId)
  if (!ready) throw new Error('訂閱尚未開放')

  const offerings = await withTimeout(
    Purchases.getOfferings(),
    OFFERINGS_TIMEOUT_MS,
    '讀取訂閱方案逾時。請確認 RevenueCat Offering 已設 Current'
  )
  const current = offerings.current
  if (!current || current.identifier !== APPLE_IAP_OFFERING_ID) {
    throw new Error('目前找不到可用的訂閱方案，請重新整理')
  }

  const monthlyPackage =
    current.monthly ??
    current.availablePackages.find(pkg => pkg.identifier === APPLE_IAP_MONTHLY_PACKAGE_ID)
  const annualPackage =
    current.annual ??
    current.availablePackages.find(pkg => pkg.identifier === APPLE_IAP_ANNUAL_PACKAGE_ID)
  const candidateProductIds = [monthlyPackage, annualPackage]
    .filter((pkg): pkg is PurchasesPackage => pkg != null)
    .map(pkg => pkg.product.identifier)

  let eligibility: Record<string, IntroEligibility> = {}
  if (candidateProductIds.length > 0) {
    try {
      eligibility = await Purchases.checkTrialOrIntroductoryPriceEligibility({
        productIdentifiers: candidateProductIds,
      })
    } catch {
      console.info('[IAP_OFFERINGS]', {
        offeringId: current.identifier,
        trialEligibilityUnavailable: true,
      })
    }
  }

  const monthly = packageOption(
    'monthly',
    monthlyPackage,
    APPLE_IAP_MONTHLY_PACKAGE_ID,
    APPLE_IAP_MONTHLY_PRODUCT_ID,
    eligibility
  )
  const annual = packageOption(
    'yearly',
    annualPackage,
    APPLE_IAP_ANNUAL_PACKAGE_ID,
    APPLE_IAP_ANNUAL_PRODUCT_ID,
    eligibility
  )
  console.info('[IAP_OFFERINGS]', {
    offeringId: current.identifier,
    monthlyAvailable: monthly != null,
    annualAvailable: annual != null,
    complete: monthly != null && annual != null,
  })
  if (!monthly && !annual) throw ascProductUnavailableError()
  if (!monthly || !annual) {
    console.warn('[IAP_OFFERINGS]', {
      offeringId: current.identifier,
      missingPackage: monthly ? 'annual' : 'monthly',
    })
  }
  return { identifier: APPLE_IAP_OFFERING_ID, monthly, annual }
}

async function executePurchase(aPackage: PurchasesPackage) {
  return withTimeout(
    Purchases.purchasePackage({ aPackage: toNativePayload(aPackage) }),
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
  const entitlement = readAndLogEntitlement(customerInfo, 'refresh')
  if (!entitlement) return { active: false }

  return {
    active: true,
    productId: entitlement.productId,
    expiresAt: entitlement.expiresAt,
  }
}

export async function purchaseAppleIap(
  userId: string,
  selectedPackage: AppleIapPackageOption,
  onStep?: (step: AppleIapPurchaseStep) => void
): Promise<AppleIapPurchaseResult> {
  try {
    console.info('[IAP_PURCHASE_STARTED]', {
      productId: selectedPackage.productId,
      packageId: selectedPackage.packageIdentifier,
      entitlementId: APPLE_IAP_ENTITLEMENT_ID,
    })
    onStep?.('configure')
    const ready = await configureAppleIap(userId)
    if (!ready) throw new Error('訂閱尚未開放')

    onStep?.('offerings')
    if (
      selectedPackage.nativePackage.identifier !== selectedPackage.packageIdentifier ||
      selectedPackage.nativePackage.product.identifier !== selectedPackage.productId ||
      !isSupportedAppleIapProductId(selectedPackage.productId)
    ) {
      throw new Error('選取的訂閱方案無效，請重新整理')
    }

    onStep?.('purchase')
    await executePurchase(selectedPackage.nativePackage)
    console.info('[IAP_PURCHASE_RESULT]', {
      completed: true,
      purchaseTarget: 'package',
      packageId: selectedPackage.packageIdentifier,
    })
    const { customerInfo } = await withTimeout(
      Purchases.getCustomerInfo(),
      OFFERINGS_TIMEOUT_MS,
      '購買完成，但讀取會員狀態逾時'
    )
    const entitlement = readAndLogEntitlement(customerInfo, 'purchase')
    if (!entitlement) {
      throw new Error('購買未完成')
    }

    onStep?.('sync')
    return await finalizeActiveAppleIapEntitlement(entitlement, () => syncToBackend())
  } catch (err) {
    const normalized = humanizePurchaseError(err)
    console.info('[IAP_PURCHASE_RESULT]', {
      completed: false,
      cancelled: normalized instanceof AppleIapCancelledError,
      errorType: normalized.name,
    })
    throw normalized
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
    const entitlement = readAndLogEntitlement(customerInfo, 'restore')
    if (!entitlement) {
      return { active: false }
    }

    return await finalizeActiveAppleIapEntitlement(entitlement, () => syncToBackend(true))
  } catch (err) {
    throw humanizePurchaseError(err)
  }
}
