import type { FoodDna, FrequentFood } from '@/lib/food-memory'
import { isNativeIOS } from '@/lib/capacitor-native'

const PHOTO_UPLOAD_MAX_EDGE = isNativeIOS() ? 768 : 1024
const PHOTO_UPLOAD_QUALITY = isNativeIOS() ? 0.72 : 0.78
const PHOTO_PARSE_TIMEOUT_MS = 45_000

export function confidenceToPct(confidence: 'high' | 'medium' | 'low'): number {
  if (confidence === 'high') return 85
  if (confidence === 'medium') return 60
  return 25
}

export function isLowConfidence(pct: number): boolean {
  return pct < 40
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('無法讀取照片'))
    reader.readAsDataURL(file)
  })
}

function scaleDimensions(width: number, height: number, maxEdge: number) {
  if (width <= maxEdge && height <= maxEdge) return { width, height }
  const scale = maxEdge / Math.max(width, height)
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
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

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('無法讀取照片'))
    }
    img.src = url
  })
}

async function rasterizeToJpegBlob(source: CanvasImageSource, width: number, height: number): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('無法處理照片')
  ctx.drawImage(source, 0, 0, width, height)
  return canvasToJpegBlob(canvas)
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

  let blob: Blob
  if (typeof createImageBitmap !== 'undefined') {
    try {
      const probe = await createImageBitmap(file)
      const { width, height } = scaleDimensions(probe.width, probe.height, PHOTO_UPLOAD_MAX_EDGE)
      probe.close()
      const bitmap = await createImageBitmap(file, {
        resizeWidth: width,
        resizeHeight: height,
        resizeQuality: 'high',
      })
      blob = await rasterizeToJpegBlob(bitmap, width, height)
      bitmap.close()
    } catch {
      const img = await loadImageFromFile(file)
      const { width, height } = scaleDimensions(
        img.naturalWidth || img.width,
        img.naturalHeight || img.height,
        PHOTO_UPLOAD_MAX_EDGE
      )
      blob = await rasterizeToJpegBlob(img, width, height)
    }
  } else {
    const img = await loadImageFromFile(file)
    const { width, height } = scaleDimensions(
      img.naturalWidth || img.width,
      img.naturalHeight || img.height,
      PHOTO_UPLOAD_MAX_EDGE
    )
    blob = await rasterizeToJpegBlob(img, width, height)
  }

  const outFile = new File([blob], `food-${Date.now()}.jpg`, { type: 'image/jpeg' })
  return { file: outFile, previewUrl: URL.createObjectURL(blob) }
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

/** Upload compressed file as multipart — avoids client-side base64 memory spike. */
export async function uploadFoodPhotoFile(file: File): Promise<PhotoParseResult> {
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
