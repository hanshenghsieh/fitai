import {
  type CategoryConfidence,
  type FoodCategory,
  inferCategoryFromText,
} from '@/lib/nutrition/food-category-guard'

export interface PhotoVisualParse {
  detected_label: string
  visual_category: FoodCategory
  category_confidence: CategoryConfidence
  possible_categories: FoodCategory[]
  visual_evidence: string[]
}

const BURGER_EVIDENCE = ['圓形麵包', '肉排或起司', '漢堡包裝', '無壽司米飯', '無海苔', '無生魚片']
const SUSHI_EVIDENCE = ['醋飯', '海苔', '生魚片或握壽司', '無漢堡麵包']

export function buildPhotoVisualParse(detectedLabel: string): PhotoVisualParse {
  const label = detectedLabel.trim() || '未知食物'
  const primary = inferCategoryFromText(label)
  const possible: FoodCategory[] = [primary]
  if (primary === 'burger' && !possible.includes('sandwich')) possible.push('sandwich')
  if (primary === 'sandwich' && !possible.includes('burger')) possible.push('burger')
  if (primary === 'bento' && !possible.includes('rice_bowl')) possible.push('rice_bowl')

  let confidence: CategoryConfidence = 'low'
  if (primary !== 'unknown') {
    confidence = /漢堡|壽司|摩斯|麥當勞|爭鮮|壽司郎/i.test(label) ? 'high' : 'medium'
  }

  const visual_evidence =
    primary === 'burger'
      ? BURGER_EVIDENCE
      : primary === 'sushi'
        ? SUSHI_EVIDENCE
        : primary !== 'unknown'
          ? [`文字線索：${label}`]
          : []

  return {
    detected_label: label,
    visual_category: primary,
    category_confidence: confidence,
    possible_categories: possible,
    visual_evidence,
  }
}
