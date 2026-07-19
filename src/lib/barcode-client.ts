'use client'

import {
  CapacitorBarcodeScanner,
  CapacitorBarcodeScannerCameraDirection,
  CapacitorBarcodeScannerScanOrientation,
  CapacitorBarcodeScannerTypeHint,
} from '@capacitor/barcode-scanner'
import { isCapacitorNative } from '@/lib/capacitor-native'
import { apiFetch } from '@/lib/api/client'
import type { BarcodeLookupResponse } from '@/lib/barcode-food'

export type NativeBarcodeScanErrorCode =
  | 'UNAVAILABLE'
  | 'PERMISSION_DENIED'
  | 'CANCELLED'
  | 'FAILED'

export class NativeBarcodeScanError extends Error {
  constructor(
    public readonly code: NativeBarcodeScanErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'NativeBarcodeScanError'
  }
}

export function nativeBarcodeScannerAvailable(): boolean {
  return isCapacitorNative()
}

/** Opens the official Capacitor native scanner UI and returns its raw GTIN text. */
export async function scanNativeBarcode(): Promise<string> {
  if (!nativeBarcodeScannerAvailable()) {
    throw new NativeBarcodeScanError(
      'UNAVAILABLE',
      '此裝置無法開啟原生掃描器，請手動輸入條碼。'
    )
  }

  try {
    const result = await CapacitorBarcodeScanner.scanBarcode({
      hint: CapacitorBarcodeScannerTypeHint.ALL,
      cameraDirection: CapacitorBarcodeScannerCameraDirection.BACK,
      scanOrientation: CapacitorBarcodeScannerScanOrientation.ADAPTIVE,
      scanInstructions: '將商品條碼置於框內',
      scanButton: false,
      cancelButtonAccessibilityLabel: '取消掃描',
      torchButtonOnAccessibilityLabel: '關閉手電筒',
      torchButtonOffAccessibilityLabel: '開啟手電筒',
    })
    const value = result.ScanResult?.trim()
    if (!value) throw new NativeBarcodeScanError('CANCELLED', '已取消掃描。')
    return value
  } catch (error) {
    if (error instanceof NativeBarcodeScanError) throw error
    const message = error instanceof Error ? error.message : String(error)
    if (/permission|denied|not authorized/i.test(message)) {
      throw new NativeBarcodeScanError(
        'PERMISSION_DENIED',
        '相機權限未開啟，請改用手動輸入或到系統設定允許相機。'
      )
    }
    if (/cancel/i.test(message)) {
      throw new NativeBarcodeScanError('CANCELLED', '已取消掃描。')
    }
    throw new NativeBarcodeScanError('FAILED', '無法啟動條碼掃描器，請改用手動輸入。')
  }
}

export async function lookupBarcode(gtin: string): Promise<BarcodeLookupResponse> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 12_000)
  try {
    const response = await apiFetch(`/api/food-barcode/${encodeURIComponent(gtin)}`, {
      method: 'GET',
      signal: controller.signal,
    })
    const body = (await response.json()) as BarcodeLookupResponse
    if (
      body &&
      typeof body === 'object' &&
      'ok' in body &&
      typeof body.ok === 'boolean'
    ) {
      return body
    }
    return { ok: false, code: 'LOOKUP_FAILED', error: '食品資料回應格式不正確。' }
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'AbortError'
    return {
      ok: false,
      code: timedOut ? 'TIMEOUT' : 'LOOKUP_FAILED',
      error: timedOut ? '食品資料查詢逾時，請再試一次。' : '目前無法查詢食品資料。',
    }
  } finally {
    window.clearTimeout(timer)
  }
}
