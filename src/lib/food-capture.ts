import type { FoodDna, FrequentFood } from '@/lib/food-memory'

const PHOTO_UPLOAD_MAX_EDGE = 1280
const PHOTO_UPLOAD_QUALITY = 0.82
const PHOTO_PARSE_TIMEOUT_MS = 45_000
const PHOTO_SKIP_COMPRESS_BYTES = 900_000

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

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('無法讀取照片'))
    img.src = dataUrl
  })
}

/** Resize/compress before upload — avoids iOS WebView OOM and API timeouts on large camera photos. */
export async function prepareFoodPhotoFile(file: File): Promise<{
  file: File
  dataUrl: string
  previewUrl: string
}> {
  if (typeof document === 'undefined') {
    const dataUrl = await fileToDataUrl(file)
    return { file, dataUrl, previewUrl: '' }
  }

  const rawDataUrl = await fileToDataUrl(file)
  const shouldCompress =
    file.size > PHOTO_SKIP_COMPRESS_BYTES ||
    file.type === 'image/png' ||
    file.type === 'image/heic' ||
    file.type === 'image/heif'

  if (!shouldCompress) {
    const img = await loadImageFromDataUrl(rawDataUrl)
    const { width, height } = scaleDimensions(
      img.naturalWidth || img.width,
      img.naturalHeight || img.height,
      PHOTO_UPLOAD_MAX_EDGE
    )
    if (width === (img.naturalWidth || img.width) && height === (img.naturalHeight || img.height)) {
      return {
        file,
        dataUrl: rawDataUrl,
        previewUrl: URL.createObjectURL(file),
      }
    }
  }

  const img = await loadImageFromDataUrl(rawDataUrl)
  const { width, height } = scaleDimensions(
    img.naturalWidth || img.width,
    img.naturalHeight || img.height,
    PHOTO_UPLOAD_MAX_EDGE
  )
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('無法處理照片')
  ctx.drawImage(img, 0, 0, width, height)

  const dataUrl = canvas.toDataURL('image/jpeg', PHOTO_UPLOAD_QUALITY)
  const blob = await fetch(dataUrl).then(r => r.blob())
  const outFile = new File([blob], `food-${Date.now()}.jpg`, { type: 'image/jpeg' })
  return {
    file: outFile,
    dataUrl,
    previewUrl: URL.createObjectURL(blob),
  }
}

export interface PhotoParseResult {
  name: string
  confidence: 'high' | 'medium' | 'low'
  confidence_pct: number
  /** AI must never supply nutrition — label only */
  ai_nutrition_suppressed: true
}

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
      body: JSON.stringify({ imageBase64: base64, mimeType: mimeType.includes('jpeg') ? 'image/jpeg' : mimeType }),
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

  let json: { error?: string; data?: { items: Array<{ name: string; confidence: 'high' | 'medium' | 'low' }> } }
  try {
    json = await res.json()
  } catch {
    throw new Error('辨識服務異常，請稍後再試')
  }

  if (!res.ok) throw new Error(json.error || '辨識失敗')

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

export async function parseFoodPhotoFile(file: File): Promise<PhotoParseResult> {
  const prepared = await prepareFoodPhotoFile(file)
  return parseFoodPhotoDataUrl(prepared.dataUrl, prepared.file.type || 'image/jpeg')
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
