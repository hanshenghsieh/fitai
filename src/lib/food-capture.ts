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
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  confidence: 'high' | 'medium' | 'low'
  confidence_pct: number
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
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
    confidence: 'high' | 'medium' | 'low'
  }>

  const merged = items.reduce(
    (acc, item) => ({
      name: acc.name ? `${acc.name} + ${item.name}` : item.name,
      calories: acc.calories + item.calories,
      protein_g: acc.protein_g + item.protein_g,
      carbs_g: acc.carbs_g + item.carbs_g,
      fat_g: acc.fat_g + item.fat_g,
      confidence: item.confidence,
    }),
    {
      name: '',
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      confidence: 'medium' as const,
    }
  )

  const worst = items.reduce<'high' | 'medium' | 'low'>(
    (worstConf, item) => {
      const order = { low: 0, medium: 1, high: 2 }
      return order[item.confidence] < order[worstConf] ? item.confidence : worstConf
    },
    'high'
  )

  return {
    ...merged,
    confidence: worst,
    confidence_pct: confidenceToPct(worst),
  }
}

export async function parseFoodPhotoFile(file: File): Promise<PhotoParseResult> {
  const dataUrl = await fileToDataUrl(file)
  return parseFoodPhotoDataUrl(dataUrl, file.type || 'image/jpeg')
}

/** Second+ encounter — use community averages from Food DNA */
export function lookupVerifiedFood(name: string, dna: FoodDna | undefined): FrequentFood | null {
  const key = name.trim().toLowerCase()
  const hit = dna?.frequent?.find(f => f.name.trim().toLowerCase() === key && f.count >= 2)
  return hit ?? null
}

export function clusterHeroForName(name: string, dna: FoodDna | undefined): string | undefined {
  return lookupVerifiedFood(name, dna)?.cluster_hero_image
}
