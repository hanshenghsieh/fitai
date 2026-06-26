import type { FoodDna, FrequentFood } from '@/lib/food-memory'

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
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
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
  const res = await fetch('/api/food-photo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: base64, mimeType }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || '辨識失敗')

  const items = json.data.items as Array<{
    name: string
    confidence: 'high' | 'medium' | 'low'
  }>

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
  const dataUrl = await fileToDataUrl(file)
  return parseFoodPhotoDataUrl(dataUrl, file.type || 'image/jpeg')
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
