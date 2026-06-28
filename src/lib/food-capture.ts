import type { FoodDna, FrequentFood } from '@/lib/food-memory'
import { isNativeIOS } from '@/lib/capacitor-native'
import { appJsonPost } from '@/lib/native-http'
import type { PhotoV2State } from '@/lib/nutrition/search-v2/photo-pipeline'

const PHOTO_UPLOAD_MAX_EDGE = isNativeIOS() ? 512 : 1024
const PHOTO_PREVIEW_MAX_EDGE = isNativeIOS() ? 384 : 640
const PHOTO_UPLOAD_QUALITY = isNativeIOS() ? 0.68 : 0.78
const PHOTO_PARSE_TIMEOUT_MS = 45_000

export function confidenceToPct(confidence: 'high' | 'medium' | 'low'): number {
  if (confidence === 'high') return 85
  if (confidence === 'medium') return 60
  return 25
}

export function isLowConfidence(pct: number): boolean {
  return pct < 40
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

async function fileToBase64(file: File): Promise<string> {
  const dataUrl = await fileToDataUrl(file)
  return dataUrl.split(',')[1] ?? ''
}

function canvasToJpegBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('無法壓縮照片'))),
      'image/jpeg',
      PHOTO_UPLOAD_QUALITY
    )
  })
}

async function rasterizeToJpegBlob(source: CanvasImageSource, width: number, height: number): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('無法處理照片')
  ctx.drawImage(source, 0, 0, width, height)
  const blob = await canvasToJpegBlob(canvas)
  canvas.width = 0
  canvas.height = 0
  return blob
}

/** Single-pass downscale — never decode full-resolution pixels on device. */
async function downscaleFileToJpegBlob(file: File, maxEdge: number): Promise<Blob> {
  if (typeof createImageBitmap !== 'undefined') {
    const bitmap = await createImageBitmap(file, {
      resizeWidth: maxEdge,
      resizeQuality: isNativeIOS() ? 'medium' : 'high',
    })
    try {
      return await rasterizeToJpegBlob(bitmap, bitmap.width, bitmap.height)
    } finally {
      bitmap.close()
    }
  }

  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('無法讀取照片'))
      el.src = url
    })
    const scale = maxEdge / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height, 1)
    const width = Math.max(1, Math.round((img.naturalWidth || img.width) * Math.min(1, scale)))
    const height = Math.max(1, Math.round((img.naturalHeight || img.height) * Math.min(1, scale)))
    return await rasterizeToJpegBlob(img, width, height)
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function previewBlobFromUploadBlob(uploadBlob: Blob): Promise<Blob> {
  if (!isNativeIOS() || PHOTO_PREVIEW_MAX_EDGE >= PHOTO_UPLOAD_MAX_EDGE) {
    return uploadBlob
  }
  const previewFile = new File([uploadBlob], 'preview.jpg', { type: 'image/jpeg' })
  return downscaleFileToJpegBlob(previewFile, PHOTO_PREVIEW_MAX_EDGE)
}

/** Resize/compress before upload — no base64 on client (keeps iOS WebView memory low). */
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
  const uploadBlob = await downscaleFileToJpegBlob(file, PHOTO_UPLOAD_MAX_EDGE)
  await yieldToMain()
  const previewBlob = await previewBlobFromUploadBlob(uploadBlob)

  const outFile = new File([uploadBlob], `food-${Date.now()}.jpg`, { type: 'image/jpeg' })
  return { file: outFile, previewUrl: URL.createObjectURL(previewBlob) }
}

export interface PhotoParseResult {
  name: string
  confidence: 'high' | 'medium' | 'low'
  confidence_pct: number
  /** AI must never supply nutrition — label only */
  ai_nutrition_suppressed: true
}

type PhotoApiJson = {
  error?: string
  data?: { items: Array<{ name: string; confidence: 'high' | 'medium' | 'low' }> }
}

function parsePhotoApiResponse(json: PhotoApiJson): PhotoParseResult {
  const items = json.data?.items ?? []
  const names = items.map(item => item.name.trim()).filter(Boolean)
  const name = names.length > 1 ? names.join(' + ') : names[0] ?? ''

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

async function uploadFoodPhotoJson(file: File): Promise<PhotoParseResult> {
  const base64 = await fileToBase64(file)
  const { ok, body } = await appJsonPost<PhotoApiJson>('/api/food-photo', {
    imageBase64: base64,
    mimeType: file.type || 'image/jpeg',
  })
  if (!ok) throw new Error(body.error || '辨識失敗')
  return parsePhotoApiResponse(body)
}

/** Upload compressed file — native HTTP on iOS to survive long AI waits. */
export async function uploadFoodPhotoFile(file: File): Promise<PhotoParseResult> {
  if (isNativeIOS()) {
    return uploadFoodPhotoJson(file)
  }

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), PHOTO_PARSE_TIMEOUT_MS)

  const formData = new FormData()
  formData.append('image', file, file.name || 'food.jpg')

  let res: Response
  try {
    res = await fetch('/api/food-photo', {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('辨識逾時，請稍後再試或改用手動輸入')
    }
    throw new Error('網路連線失敗，請確認網路後再試')
  } finally {
    window.clearTimeout(timer)
  }

  let json: PhotoApiJson
  try {
    json = await res.json()
  } catch {
    throw new Error('辨識服務異常，請稍後再試')
  }

  if (!res.ok) throw new Error(json.error || '辨識失敗')

  return parsePhotoApiResponse(json)
}

/** Server-side nutrition match — small JSON payload for iOS WebView. */
export async function fetchPhotoMatch(
  label: string,
  opts?: { store?: string; photo_id?: string }
): Promise<PhotoV2State> {
  const { ok, body } = await appJsonPost<{ error?: string; photo_v2?: PhotoV2State }>(
    '/api/food-photo/match',
    {
      label,
      store: opts?.store,
      photo_id: opts?.photo_id,
    }
  )
  if (!ok || !body.photo_v2) throw new Error(body.error || '比對失敗')
  return body.photo_v2
}

/** @deprecated Prefer uploadFoodPhotoFile — JSON base64 doubles memory on iOS. */
export async function parseFoodPhotoDataUrl(
  dataUrl: string,
  mimeType = 'image/jpeg'
): Promise<PhotoParseResult> {
  const base64 = dataUrl.split(',')[1] ?? ''
  if (!base64) throw new Error('照片格式無效')

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), PHOTO_PARSE_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch('/api/food-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: base64,
        mimeType: mimeType.includes('jpeg') ? 'image/jpeg' : mimeType,
      }),
      signal: controller.signal,
    })
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('辨識逾時，請稍後再試或改用手動輸入')
    }
    throw new Error('網路連線失敗，請確認網路後再試')
  } finally {
    window.clearTimeout(timer)
  }

  let json: PhotoApiJson
  try {
    json = await res.json()
  } catch {
    throw new Error('辨識服務異常，請稍後再試')
  }

  if (!res.ok) throw new Error(json.error || '辨識失敗')

  return parsePhotoApiResponse(json)
}

export async function parseFoodPhotoFile(file: File): Promise<PhotoParseResult> {
  const prepared = await prepareFoodPhotoFile(file)
  return uploadFoodPhotoFile(prepared.file)
}

/** Community Food DNA — hero image / frequency only. Do NOT use for nutrition writes; use Search V2. */
export function lookupVerifiedFood(name: string, dna: FoodDna | undefined): FrequentFood | null {
  const key = name.trim().toLowerCase()
  const hit = dna?.frequent?.find(f => f.name.trim().toLowerCase() === key && f.count >= 2)
  return hit ?? null
}

export function clusterHeroForName(name: string, dna: FoodDna | undefined): string | undefined {
  return lookupVerifiedFood(name, dna)?.cluster_hero_image
}
