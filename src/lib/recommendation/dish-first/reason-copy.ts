import type { TodayMealState } from '@/lib/engines/next-meal-engine'
import type { DishRecommendationResult, DishTemplate, DishVariant } from './types'
import { templateRequiresSpecificVariant } from './display'

export function buildDishRecommendationReasons(params: {
  template: DishTemplate
  variant: DishVariant | null
  day: TodayMealState
}): { reasons: DishRecommendationResult['reasons']; benefitPoints: string[]; eatingTips: string[] } {
  const { template, variant, day } = params
  const calories = variant?.typicalCalories ?? template.typicalCalories
  const protein = variant?.typicalProtein ?? template.typicalProtein
  const fat = variant?.typicalFat ?? template.typicalFat
  const displayName = variant?.name ?? template.name
  const reasons: DishRecommendationResult['reasons'] = []
  const benefitPoints: string[] = []
  const eatingTips = [...(variant?.recommendedAdjustments ?? template.recommendedAdjustments ?? [])].slice(0, 3)

  if (day.proteinGap > 12) {
    reasons.push({ code: 'protein_gap', label: `你今天蛋白質還差 ${Math.round(day.proteinGap)}g` })
    if (/滷味|火鍋|雞胸|牛肉|海鮮/.test(displayName)) {
      benefitPoints.push(`${displayName}可以補一部分蛋白質`)
    } else if (protein) {
      benefitPoints.push(`這餐可以補上大約 ${protein.min}–${protein.max}g 蛋白質`)
    } else {
      benefitPoints.push('這餐可以補蛋白質')
    }
  }

  if (day.remainingCalories <= 120) {
    reasons.push({ code: 'low_cal_remaining', label: '今天熱量剩不多，這組比較好控制' })
    if (/地瓜|茶葉蛋|沙拉|昆布|豆腐|小份|少飯/.test(displayName)) {
      benefitPoints.push(`${displayName}比大碗麵或炸物更容易控制熱量`)
    } else if (variant?.name.includes('炸')) {
      benefitPoints.push('優先選滷或烤，不建議炸雞腿')
    }
    benefitPoints.push('不要加含糖飲料，會比較穩')
  } else if (calories.mid <= day.effectiveMealCalTarget * 1.15) {
    reasons.push({ code: 'calorie_fit', label: '熱量落在下一餐可接受範圍' })
    benefitPoints.push('熱量還在可控制範圍內')
  }

  if (/火鍋/.test(template.name) && variant) {
    if (/牛肉|海鮮|雞肉/.test(variant.name) && day.proteinGap > 12) {
      benefitPoints.push('建議選昆布湯底，少沙茶醬')
      benefitPoints.push('不要加王子麵，熱量會比較穩')
    }
  }

  if (/滷味/.test(template.name) && variant) {
    if (/雞胸|高蛋白|豆腐/.test(variant.name)) {
      benefitPoints.push('滷味可以避開飯麵，碳水比較好控')
      benefitPoints.push('少選百頁豆腐、甜不辣，脂肪會比較穩')
    }
  }

  if (/地瓜/.test(displayName) && /茶葉蛋/.test(displayName)) {
    benefitPoints.push('茶葉蛋可以補一點蛋白質')
    benefitPoints.push('地瓜比甜點或炸物穩定')
  }

  if (fat && fat.mid >= 38 && /牛奶|麻辣|羊肉|炸/.test(displayName)) {
    reasons.push({ code: 'fat_watch', label: '這種吃法油脂較高，建議湯少喝、醬料少' })
    benefitPoints.push(`${displayName}比清湯或海鮮鍋更容易拉高脂肪`)
  } else if (fat && fat.mid >= 32 && day.remainingCalories > 0 && !templateRequiresSpecificVariant(template)) {
    reasons.push({ code: 'fat_watch', label: '你今天脂肪已經偏高' })
    benefitPoints.push('建議選烤 / 滷，避開炸物')
    benefitPoints.push('醬汁少一點，整餐會更穩')
  }

  if (template.supportsRiceAmount || template.supportsSauce) {
    benefitPoints.push('建議少飯、醬汁少，熱量會更穩')
  }

  if (!reasons.length) {
    reasons.push({ code: 'balanced', label: '這是外食中比較好控制的選擇' })
    benefitPoints.push('蛋白質足夠')
    benefitPoints.push('照著建議吃法，不用硬撐也不必節食')
  }

  return {
    reasons: reasons.slice(0, 3),
    benefitPoints: [...new Set(benefitPoints)].slice(0, 3),
    eatingTips,
  }
}

export function dishDataNote(template: DishTemplate): string | undefined {
  if (template.sourceType === 'official') return undefined
  if (template.confidence === 'low') {
    return '我先用常見外食資料幫你估算。實際熱量會因店家、份量、醬汁而不同。'
  }
  return undefined
}

export function sourceTypeLabel(sourceType: DishTemplate['sourceType']): string {
  if (sourceType === 'official') return '官方資料'
  if (sourceType === 'database_estimate') return '資料庫估算'
  if (sourceType === 'manual') return '手動估算'
  return '自訂資料'
}
