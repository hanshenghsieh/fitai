import type { FoodDna, FrequentFood } from '@/lib/food-memory'
import { isNativeIOS } from '@/lib/capacitor-native'

const PHOTO_PARSE_TIMEOUT_MS = 45_000

function photoUploadMaxEdge() {
  return isNativeIOS() ? 512 : 1024
}

function photoUploadQuality() {
  return isNativeIOS() ? 0.7 : 0.78
}

export function confidenceToPct(confidence: 'high' | 'medium' | 'low'): number {
  if (confidence === 'high') return 85
  if (confidence === 'medium') return 60
  return 25
}

export function isLowConfidence(pct: number): boolean {
  return pct < 40
}

/** After gallery/camera on iOS, wait until WebView is active again. */
export async function waitForAppVisible(): Promise<void> {
  if (typeof document === 'undefined') return
  if (document.visibilityState === 'visible') {
    await new Promise<void>(resolve => {
      setTimeout(resolve, 250)
    })
    return
  }
  await new Promise<void>(resolve => {
    const finish = () => {
      document.removeEventListener('visibilitychange', onChange)
      setTimeout(resolve, 250)
    }
    const onChange = () => {
      if (document.visibilityState === 'visible') finish()
    }
    document.addEventListener('visibilitychange', onChange)
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

function canvasToJpegBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('無法壓縮照片'))),
      'image/jpeg',
      photoUploadQuality()
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

async function downscaleFileToJpegBlob(file: File): Promise<Blob> {
  const maxEdge = photoUploadMaxEdge()
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

/** Upload via multipart — same path web + iOS, with session cookies. */
export async function uploadFoodPhotoFile(file: File): Promise<PhotoParseResult> {
  await waitForAppVisible()

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), PHOTO_PARSE_TIMEOUT_MS)

  const formData = new FormData()
  formData.append('image', file, file.name || 'food.jpg')

  let res: Response
  try {
    res = await fetch('/api/food-photo', {
      method: 'POST',
      body: formData,
      credentials: 'include',
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

export async function parseFoodPhotoDataUrl(
  dataUrl: string,
  mimeType = 'image/jpeg'
): Promise<PhotoParseResult> {
  const base64 = dataUrl.split(',')[1] ?? ''
  if (!base64) throw new Error('照片格式無效')

  await waitForAppVisible()

  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), PHOTO_PARSE_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch('/api/food-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
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

export function lookupVerifiedFood(name: string, dna: FoodDna | undefined): FrequentFood | null {
  const key = name.trim().toLowerCase()
  const hit = dna?.frequent?.find(f => f.name.trim().toLowerCase() === key && f.count >= 2)
  return hit ?? null
}

export function clusterHeroForName(name: string, dna: FoodDna | undefined): string | undefined {
  return lookupVerifiedFood(name, dna)?.cluster_hero_image
}
