import type { FoodDna, FrequentFood } from '@/lib/food-memory'
import { isNativeIOS } from '@/lib/capacitor-native'
import type { PhotoV2State } from '@/lib/nutrition/search-v2/photo-pipeline'
import { apiFetch } from '@/lib/api/client'

const PHOTO_PARSE_TIMEOUT_MS = 45_000
/**
 * Build 38 BUG 4 — first-pass identification quality. 512px/quality 0.7 was
 * aggressive enough to destroy the fine texture (ridges, dicing, surface
 * detail) a vision model needs to tell diced potato/cucumber salad apart
 * from potato-chip ridges or citrus slices. 1024px/0.8 is well inside the
 * two size ceilings this pipeline already enforces and tests against —
 * NATIVE_PHOTO_BASE64_MAX_CHARS below (client) and MAX_JSON_BINARY_BYTES in
 * app/api/food-photo/route.ts (server, same 3.5MB base64 char budget) — a
 * 1024px JPEG at quality 0.8 for a typical phone food photo lands well
 * under a megabyte, nowhere near either cap. If a specific photo still
 * produces an oversized payload, the existing retry path below
 * (NATIVE_PHOTO_RETRY_MAX_EDGE / NATIVE_PHOTO_RETRY_QUALITY) still shrinks
 * it — this only raises the *first* attempt's target, the safety-net
 * fallback is unchanged.
 */
export const NATIVE_PHOTO_MAX_EDGE = 1024
export const NATIVE_PHOTO_RETRY_MAX_EDGE = 384
export const NATIVE_PHOTO_JPEG_QUALITY = 0.8
export const NATIVE_PHOTO_RETRY_QUALITY = 0.55
export const NATIVE_PHOTO_BASE64_MAX_CHARS = Math.floor(3.5 * 1024 * 1024)
export const NATIVE_PHOTO_BINARY_MAX_BYTES = Math.floor(
  NATIVE_PHOTO_BASE64_MAX_CHARS * 0.75
)

export type FoodPhotoSource = 'camera' | 'library'
export type FoodPhotoTransport = 'multipart' | 'base64-json'
export type FoodPhotoErrorCode =
  | 'PHOTO_AUTH_REQUIRED'
  | 'PHOTO_TOO_LARGE'
  | 'PHOTO_FORMAT_UNSUPPORTED'
  | 'PHOTO_PERMISSION_DENIED'
  | 'PHOTO_OFFLINE'
  | 'PHOTO_SERVER_ERROR'
  | 'PHOTO_TIMEOUT'
  | 'PHOTO_CANCELLED'

export class FoodPhotoError extends Error {
  code: FoodPhotoErrorCode
  status?: number

  constructor(code: FoodPhotoErrorCode, message: string, status?: number) {
    super(message)
    this.name = 'FoodPhotoError'
    this.code = code
    this.status = status
  }
}

export function foodPhotoTransport(native = isNativeIOS()): FoodPhotoTransport {
  return native ? 'base64-json' : 'multipart'
}

export function foodPhotoErrorCodeForStatus(status: number): FoodPhotoErrorCode {
  if (status === 401 || status === 403) return 'PHOTO_AUTH_REQUIRED'
  if (status === 413) return 'PHOTO_TOO_LARGE'
  if (status === 415) return 'PHOTO_FORMAT_UNSUPPORTED'
  return 'PHOTO_SERVER_ERROR'
}

export function nativePhotoPayloadFitsLimits(
  binaryBytes: number,
  base64Length: number
): boolean {
  return (
    binaryBytes <= NATIVE_PHOTO_BINARY_MAX_BYTES &&
    base64Length <= NATIVE_PHOTO_BASE64_MAX_CHARS
  )
}

function photoUploadMaxEdge() {
  return isNativeIOS() ? NATIVE_PHOTO_MAX_EDGE : 1024
}

function photoUploadQuality() {
  return isNativeIOS() ? NATIVE_PHOTO_JPEG_QUALITY : 0.78
}

export function confidenceToPct(confidence: 'high' | 'medium' | 'low'): number {
  if (confidence === 'high') return 85
  if (confidence === 'medium') return 60
  return 25
}

export function isLowConfidence(pct: number): boolean {
  return pct < 40
}

/** After gallery/camera on iOS, brief yield so WebView is active. */
export async function waitForAppVisible(): Promise<void> {
  if (typeof document === 'undefined' || !isNativeIOS()) return
  if (document.visibilityState !== 'visible') {
    await new Promise<void>(resolve => {
      const finish = () => {
        document.removeEventListener('visibilitychange', onChange)
        setTimeout(resolve, 80)
      }
      const onChange = () => {
        if (document.visibilityState === 'visible') finish()
      }
      document.addEventListener('visibilitychange', onChange)
    })
    return
  }
  await new Promise<void>(resolve => {
    setTimeout(resolve, 80)
  })
}

function yieldToMain(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => setTimeout(resolve, 0))
  })
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('無法讀取照片'))
    reader.readAsDataURL(file)
  })
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality = photoUploadQuality()): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('無法壓縮照片'))),
      'image/jpeg',
      quality
    )
  })
}

async function rasterizeToJpegBlob(
  source: CanvasImageSource,
  width: number,
  height: number,
  quality = photoUploadQuality()
): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('無法處理照片')
  ctx.drawImage(source, 0, 0, width, height)
  const blob = await canvasToJpegBlob(canvas, quality)
  canvas.width = 0
  canvas.height = 0
  return blob
}

export function scaledDimensions(width: number, height: number, maxEdge: number) {
  const scale = maxEdge / Math.max(width, height, 1)
  return {
    width: Math.max(1, Math.round(width * Math.min(1, scale))),
    height: Math.max(1, Math.round(height * Math.min(1, scale))),
  }
}

async function downscaleWithImageElement(
  file: File,
  maxEdge: number,
  quality: number
): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('image decode failed'))
      el.src = url
    })
    const dimensions = scaledDimensions(
      img.naturalWidth || img.width,
      img.naturalHeight || img.height,
      maxEdge
    )
    return await rasterizeToJpegBlob(img, dimensions.width, dimensions.height, quality)
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function downscaleFileToJpegBlob(
  file: File,
  maxEdge = photoUploadMaxEdge(),
  quality = photoUploadQuality()
): Promise<Blob> {
  if (typeof createImageBitmap !== 'undefined') {
    try {
      const bitmap = await createImageBitmap(file)
      try {
        const dimensions = scaledDimensions(bitmap.width, bitmap.height, maxEdge)
        return await rasterizeToJpegBlob(
          bitmap,
          dimensions.width,
          dimensions.height,
          quality
        )
      } finally {
        bitmap.close()
      }
    } catch {
      // WKWebView can expose createImageBitmap but fail to decode HEIC/HEIF.
      // Fall through to the native WebKit <img> decoder before rejecting.
    }
  }

  try {
    return await downscaleWithImageElement(file, maxEdge, quality)
  } catch {
    throw new FoodPhotoError(
      'PHOTO_FORMAT_UNSUPPORTED',
      '目前無法讀取這種照片格式，請改用 JPEG 或重新拍攝。'
    )
  }
}

/** Compress large gallery photos before upload — single-pass resize only. */
export async function prepareFoodPhotoFile(file: File): Promise<{
  file: File
  previewUrl: string
}> {
  if (typeof document === 'undefined') {
    return { file, previewUrl: '' }
  }

  const mustCompress =
    isNativeIOS() ||
    file.size > 400_000 ||
    file.type === 'image/png' ||
    file.type === 'image/heic' ||
    file.type === 'image/heif'

  if (!mustCompress) {
    return { file, previewUrl: URL.createObjectURL(file) }
  }

  await yieldToMain()
  const uploadBlob = await downscaleFileToJpegBlob(file)
  const outFile = new File([uploadBlob], `food-${Date.now()}.jpg`, { type: 'image/jpeg' })
  return { file: outFile, previewUrl: URL.createObjectURL(uploadBlob) }
}

export interface PhotoParseResult {
  name: string
  confidence: 'high' | 'medium' | 'low'
  confidence_pct: number
  ai_nutrition_suppressed: true
}

export type PhotoApiJson = {
  error?: string
  data?: {
    items: Array<{ name: string; confidence: 'high' | 'medium' | 'low' }>
    is_composite_dish?: boolean
    dish_name?: string
  }
}

/**
 * Build 38 BUG 4 — dish-first naming. When the model explicitly identified
 * the photo as one already-composed dish (is_composite_dish + dish_name,
 * see the prompt in claude/client.ts), that dish-level name is preferred
 * over joining the per-item guesses — a compound dish should not be
 * re-decomposed into "ingredient A + ingredient B + ..." for display/search
 * just because the model also filled in an items[] breakdown. Deterministic
 * on the model's own structured fields, not a guess from meal_summary.
 */
export function parsePhotoApiResponse(json: PhotoApiJson): PhotoParseResult {
  const items = json.data?.items ?? []
  const names = items.map(item => item.name.trim()).filter(Boolean)
  const dishName = json.data?.dish_name?.trim()
  const isCompositeDish = json.data?.is_composite_dish === true
  const name =
    isCompositeDish && dishName
      ? dishName
      : names.length > 1
        ? names.join(' + ')
        : names[0] ?? ''

  const worst = items.reduce<'high' | 'medium' | 'low'>(
    (worstConf, item) => {
      const order = { low: 0, medium: 1, high: 2 }
      return order[item.confidence] < order[worstConf] ? item.confidence : worstConf
    },
    'high'
  )

  return {
    name,
    confidence: worst,
    confidence_pct: confidenceToPct(worst),
    ai_nutrition_suppressed: true,
  }
}

function foodPhotoErrorForResponse(status: number): FoodPhotoError {
  const code = foodPhotoErrorCodeForStatus(status)
  const message =
    code === 'PHOTO_AUTH_REQUIRED'
      ? '登入狀態已失效，請重新登入後再試。'
      : code === 'PHOTO_TOO_LARGE'
        ? '照片太大，請換一張或重新拍攝。'
        : code === 'PHOTO_FORMAT_UNSUPPORTED'
          ? '目前無法讀取這種照片格式，請改用 JPEG 或重新拍攝。'
          : '照片辨識暫時失敗，請稍後再試。'
  return new FoodPhotoError(code, message, status)
}

async function sendFoodPhotoRequest(options: RequestInit): Promise<PhotoParseResult> {
  await waitForAppVisible()

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), PHOTO_PARSE_TIMEOUT_MS)

  let res: Response
  try {
    res = await apiFetch('/api/food-photo', {
      ...options,
      method: 'POST',
      signal: controller.signal,
    })
  } catch (err) {
    if (err instanceof FoodPhotoError) throw err
    if (err instanceof Error && err.name === 'AbortError') {
      throw new FoodPhotoError(
        'PHOTO_TIMEOUT',
        '照片上傳時間過久，請檢查網路後重試。'
      )
    }
    throw new FoodPhotoError(
      'PHOTO_OFFLINE',
      '目前沒有網路，照片已保留，連線後可重新嘗試。'
    )
  } finally {
    window.clearTimeout(timer)
  }

  let json: PhotoApiJson
  try {
    json = await res.json()
  } catch {
    if (!res.ok) throw foodPhotoErrorForResponse(res.status)
    throw new FoodPhotoError('PHOTO_SERVER_ERROR', '照片辨識暫時失敗，請稍後再試。')
  }

  if (!res.ok) throw foodPhotoErrorForResponse(res.status)

  return parsePhotoApiResponse(json)
}

async function nativePhotoJsonPayload(
  file: File,
  source: FoodPhotoSource
): Promise<{
  imageBase64: string
  mimeType: 'image/jpeg'
  filename: string
  source: FoodPhotoSource
}> {
  let uploadFile = file
  if (uploadFile.type !== 'image/jpeg') {
    const jpeg = await downscaleFileToJpegBlob(
      uploadFile,
      NATIVE_PHOTO_MAX_EDGE,
      NATIVE_PHOTO_JPEG_QUALITY
    )
    uploadFile = new File([jpeg], `food-${Date.now()}.jpg`, { type: 'image/jpeg' })
  }

  let retried = false
  if (uploadFile.size > NATIVE_PHOTO_BINARY_MAX_BYTES) {
    const retryBlob = await downscaleFileToJpegBlob(
      uploadFile,
      NATIVE_PHOTO_RETRY_MAX_EDGE,
      NATIVE_PHOTO_RETRY_QUALITY
    )
    uploadFile = new File([retryBlob], `food-${Date.now()}.jpg`, { type: 'image/jpeg' })
    retried = true
  }

  let imageBase64 = (await fileToDataUrl(uploadFile)).split(',')[1] ?? ''
  if (!imageBase64) {
    throw new FoodPhotoError('PHOTO_FORMAT_UNSUPPORTED', '照片格式無效，請重新拍攝。')
  }
  if (imageBase64.length > NATIVE_PHOTO_BASE64_MAX_CHARS && !retried) {
    const retryBlob = await downscaleFileToJpegBlob(
      uploadFile,
      NATIVE_PHOTO_RETRY_MAX_EDGE,
      NATIVE_PHOTO_RETRY_QUALITY
    )
    uploadFile = new File([retryBlob], `food-${Date.now()}.jpg`, { type: 'image/jpeg' })
    imageBase64 = (await fileToDataUrl(uploadFile)).split(',')[1] ?? ''
  }
  if (!nativePhotoPayloadFitsLimits(uploadFile.size, imageBase64.length)) {
    throw new FoodPhotoError('PHOTO_TOO_LARGE', '照片太大，請換一張或重新拍攝。')
  }

  return {
    imageBase64,
    mimeType: 'image/jpeg',
    filename: uploadFile.name || 'food.jpg',
    source,
  }
}

/** Web uses multipart; Capacitor native uses compressed JPEG base64 JSON. */
export async function uploadFoodPhotoFile(
  file: File,
  source: FoodPhotoSource = 'library'
): Promise<PhotoParseResult> {
  if (foodPhotoTransport() === 'base64-json') {
    const payload = await nativePhotoJsonPayload(file, source)
    return sendFoodPhotoRequest({
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }

  const formData = new FormData()
  formData.append('image', file, file.name || 'food.jpg')
  return sendFoodPhotoRequest({ body: formData })
}

export async function parseFoodPhotoDataUrl(
  dataUrl: string,
  mimeType = 'image/jpeg',
  source: FoodPhotoSource = 'library'
): Promise<PhotoParseResult> {
  const base64 = dataUrl.split(',')[1] ?? ''
  if (!base64) {
    throw new FoodPhotoError('PHOTO_FORMAT_UNSUPPORTED', '照片格式無效，請重新拍攝。')
  }
  if (base64.length > NATIVE_PHOTO_BASE64_MAX_CHARS) {
    throw new FoodPhotoError('PHOTO_TOO_LARGE', '照片太大，請換一張或重新拍攝。')
  }
  return sendFoodPhotoRequest({
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64: base64,
      mimeType: mimeType.includes('jpeg') ? 'image/jpeg' : mimeType,
      filename: `food-${Date.now()}.jpg`,
      source,
    }),
  })
}

/** Server-side nutrition match — never run menu search in iOS WebView. */
export async function fetchPhotoMatch(
  label: string,
  opts?: { store?: string; photo_id?: string }
): Promise<PhotoV2State> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 20_000)

  let res: Response
  try {
    res = await apiFetch('/api/food-photo/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label,
        store: opts?.store,
        photo_id: opts?.photo_id,
      }),
      signal: controller.signal,
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('營養比對逾時，請稍後再試')
    }
    throw new Error('營養比對失敗，請稍後再試')
  } finally {
    window.clearTimeout(timer)
  }

  const json = (await res.json()) as { error?: string; photo_v2?: PhotoV2State }
  if (!res.ok || !json.photo_v2) throw new Error(json.error || '營養比對失敗')
  return json.photo_v2
}

export async function parseFoodPhotoFile(
  file: File,
  source: FoodPhotoSource = 'library'
): Promise<PhotoParseResult> {
  const prepared = await prepareFoodPhotoFile(file)
  return uploadFoodPhotoFile(prepared.file, source)
}

export function lookupVerifiedFood(name: string, dna: FoodDna | undefined): FrequentFood | null {
  const key = name.trim().toLowerCase()
  const hit = dna?.frequent?.find(f => f.name.trim().toLowerCase() === key && f.count >= 2)
  return hit ?? null
}

export function clusterHeroForName(name: string, dna: FoodDna | undefined): string | undefined {
  return lookupVerifiedFood(name, dna)?.cluster_hero_image
}
